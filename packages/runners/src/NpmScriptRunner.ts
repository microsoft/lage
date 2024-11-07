import { join } from "path";
import { readFile } from "fs/promises";
import { spawn, type ChildProcess } from "child_process";
import os from "os";
import type { TargetRunner, TargetRunnerOptions } from "./types/TargetRunner.js";
import type { Target } from "@lage-run/target-graph";

export interface NpmScriptRunnerOptions {
  taskArgs: string[];
  nodeOptions: string;
  npmCmd: string;
}

/**
 * Runs a npm script on a target.
 *
 * Requires target to have a packageName, and a task.
 *
 * This class deals with these concepts:
 *
 * 1. Spawning the npm client.
 * 2. Generates npm command line arguments
 * 3. Handling exit & error events from child process.
 * 4. Stream stdout & stderr from child process to a logger.
 * 5. Handling the abort controller signal - kills the child process if started.
 * 6. injecting these environment variables into the child process:
 *    - LAGE_PACKAGE_NAME - the name of the package
 *    - LAGE_TASK - the name of the task
 *    - NODE_OPTIONS - the node options to use when spawning the child process
 *    - FORCE_COLOR - set to "1" detect that this is a TTY
 */
export class NpmScriptRunner implements TargetRunner {
  static gracefulKillTimeout = 2500;

  constructor(private options: NpmScriptRunnerOptions) {}

  private getNpmArgs(task: string, taskTargs: string[]) {
    const extraArgs = taskTargs.length > 0 ? ["--", ...taskTargs] : [];
    return ["run", task, ...extraArgs];
  }

  private async hasNpmScript(target: Target) {
    const task = target.options?.script ?? target.task;
    const packageJsonPath = join(target.cwd, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    return !!packageJson.scripts?.[task];
  }

  async shouldRun(target: Target) {
    // By convention, do not run anything if there is no script for this task defined in package.json (counts as "success")
    const hasNpmScript = await this.hasNpmScript(target);

    return hasNpmScript && (target.shouldRun ?? true);
  }

  async run(runOptions: TargetRunnerOptions) {
    const { target, weight, abortSignal } = runOptions;
    const { nodeOptions, npmCmd, taskArgs } = this.options;
    const task = target.options?.script ?? target.task;

    let childProcess: ChildProcess | undefined;

    /**
     * Handling abort signal from the abort controller. Gracefully kills the process,
     * will be handled by exit handler separately to resolve the promise.
     */
    if (abortSignal) {
      if (abortSignal.aborted) {
        return;
      }

      const abortSignalHandler = () => {
        abortSignal.removeEventListener("abort", abortSignalHandler);
        if (childProcess && !childProcess.killed) {
          const pid = childProcess.pid;

          process.stdout.write(`Abort signal detected, attempting to killing process id ${pid}\n`);

          childProcess.kill("SIGTERM");

          // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
          const t = setTimeout(() => {
            if (childProcess && !childProcess.killed) {
              childProcess.kill("SIGKILL");
            }
          }, NpmScriptRunner.gracefulKillTimeout);

          // Remember that even this timeout needs to be unref'ed, otherwise the process will hang due to this timeout
          if (t.unref) {
            t.unref();
          }
        }
      };

      abortSignal.addEventListener("abort", abortSignalHandler);
    }

    /**
     * Actually spawn the npm client to run the task
     */
    const npmRunArgs = this.getNpmArgs(task, taskArgs);
    const npmRunNodeOptions = [nodeOptions, target.options?.nodeOptions].filter((str) => str).join(" ");

    await new Promise<void>((resolve, reject) => {
      childProcess = spawn(npmCmd, npmRunArgs, {
        cwd: target.cwd,
        stdio: ["inherit", "pipe", "pipe"],
        // This is required for Windows due to https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
        ...(os.platform() === "win32" && { shell: true }),
        env: {
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }), // allow user env to override this
          ...process.env,
          ...(npmRunNodeOptions && { NODE_OPTIONS: npmRunNodeOptions }),
          LAGE_PACKAGE_NAME: target.packageName,
          LAGE_TASK: target.task,
          LAGE_WEIGHT: String(weight),
        },
      });

      let exitHandled = false;

      const handleChildProcessExit = (code: number) => {
        childProcess?.off("exit", handleChildProcessExit);
        childProcess?.off("error", handleChildProcessExit);

        if (exitHandled) {
          return;
        }

        exitHandled = true;

        childProcess?.stdout?.destroy();
        childProcess?.stderr?.destroy();
        childProcess?.stdin?.destroy();

        if (code === 0) {
          return resolve();
        }

        reject(new Error(`NPM Script Runner: ${npmCmd} ${npmRunArgs.join(" ")} exited with code ${code}`));
      };

      const { pid } = childProcess;

      process.stdout.write(`Running ${[npmCmd, ...npmRunArgs].join(" ")}, pid: ${pid}\n`);

      const stdout = childProcess.stdout!;
      const stderr = childProcess.stderr!;

      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);

      childProcess.on("exit", handleChildProcessExit);
      childProcess.on("error", () => handleChildProcessExit(1));
    });
  }
}
