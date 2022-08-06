import { AbortSignal } from "abort-controller";
import { join } from "path";
import { Logger, LogLevel } from "@lage-run/logger";
import { readFile } from "fs/promises";
import { spawn } from "child_process";
import { TargetRunner } from "../types/TargetRunner";
import type { Target } from "@lage-run/target-graph";

export interface NpmScriptRunnerOptions {
  logger: Logger;
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
    const { task } = target;
    const packageJsonPath = join(target.cwd, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    return packageJson.scripts?.[task];
  }

  async run(target: Target, abortSignal?: AbortSignal) {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }

    const { logger, nodeOptions, npmCmd, taskArgs } = this.options;

    if (!(await this.hasNpmScript(target))) {
      return;
    }

    const npmRunArgs = this.getNpmArgs(target.task, taskArgs);
    const npmRunNodeOptions = [nodeOptions, target.options?.nodeOptions].filter((str) => str).join(" ");

    await new Promise<void>((resolve, reject) => {
      const cp = spawn(npmCmd, npmRunArgs, {
        cwd: target.cwd,
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
          ...(npmRunNodeOptions && { NODE_OPTIONS: npmRunNodeOptions }),
          LAGE_PACKAGE_NAME: target.packageName,
          LAGE_TASK: target.task,
        },
      });

      logger.verbose(`Running ${[npmCmd, ...npmRunArgs].join(" ")}, pid: ${cp.pid}`, { target, pid: cp.pid });

      logger.stream(LogLevel.verbose, cp.stdout, { target, pid: cp.pid });
      logger.stream(LogLevel.verbose, cp.stderr, { target, pid: cp.pid });

      let exitHandled = false;

      cp.on("exit", handleChildProcessExit);
      cp.on("error", () => handleChildProcessExit(1));

      function handleChildProcessExit(code: number) {
        if (exitHandled) {
          return;
        }

        exitHandled = true;

        cp.stdout.destroy();
        cp.stdin.destroy();

        if (code === 0) {
          return resolve();
        }

        reject(false);
      }

      if (abortSignal) {
        /**
         * Handling abort signal from the abort controller. Gracefully kills the process,
         * will be handled by exit handler separately to resolve the promise.
         */
        abortSignal.addEventListener("aborted", () => {
          logger.verbose(`Abort signal detected, killing process id: ${cp.pid}}`, { target, pid: cp.pid });

          if (!cp.killed) {
            cp.kill("SIGTERM");

            // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
            setTimeout(() => {
              if (!cp.killed) {
                cp.kill("SIGKILL");
              }
            }, NpmScriptRunner.gracefulKillTimeout);
          }
        });
      }
    });
  }
}
