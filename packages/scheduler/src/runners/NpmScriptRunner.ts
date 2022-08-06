import { Logger, LogLevel } from "@lage-run/logger";
import { AbortSignal } from "abort-controller";
import { spawn } from "child_process";
import { TargetRunner } from "../types/TargetRunner";
import type { Target } from "@lage-run/target-graph";

export interface NpmScriptRunnerOptions {
  logger: Logger;
  taskArgs: string[];
  nodeOptions: string;
  npmCmd: string;
}

export class NpmScriptRunner implements TargetRunner {
  static gracefulKillTimeout = 2500;

  constructor(private options: NpmScriptRunnerOptions) {}

  private getNpmArgs(task: string, taskTargs: string[]) {
    const extraArgs = taskTargs.length > 0 ? ["--", ...taskTargs] : [];
    return ["run", task, ...extraArgs];
  }

  run(target: Target, abortSignal?: AbortSignal) {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }

    const { logger, nodeOptions, npmCmd, taskArgs } = this.options;

    const npmRunArgs = this.getNpmArgs(target.task, taskArgs);
    const npmRunNodeOptions = [nodeOptions, target.options?.nodeOptions].filter(str => str).join(' ');

    return new Promise<void>((resolve, reject) => {
      const cp = spawn(npmCmd, npmRunArgs, {
        cwd: target.cwd,
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
          ...(npmRunNodeOptions && { NODE_OPTIONS: npmRunNodeOptions }),
          LAGE_PACKAGE_NAME: target.packageName,
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

          cp.kill("SIGTERM");

          // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
          setTimeout(() => {
            if (!cp.killed) {
              cp.kill("SIGKILL");
            }
          }, NpmScriptRunner.gracefulKillTimeout);
        });
      }
    });
  }
}
