import { Logger, LogLevel } from "@lage-run/logger";
import { AbortSignal } from "abort-controller";
import { spawn } from "child_process";
import { TargetRunner } from "../types/TargetRunner";
import type { ChildProcess } from "child_process";
import type { Target } from "@lage-run/target-graph";

export interface NpmScriptRunnerOptions {
  logger: Logger;
  commandArgs: string[];
  nodeArgs: string[];
  npmCmd: string;
}

export class NpmScriptRunner implements TargetRunner {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];

  constructor(private options: NpmScriptRunnerOptions) {}

  private getNpmCommand(nodeArgs: string[], passThroughArgs: string[], task: string) {
    const extraArgs = passThroughArgs.length > 0 ? ["--", ...passThroughArgs] : [];
    return [...nodeArgs, "run", task, ...extraArgs];
  }

  run(target: Target, abortSignal?: AbortSignal) {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }

    const { logger, nodeArgs, commandArgs } = this.options;
    const { npmCmd } = NpmScriptRunner;

    const npmArgs = this.getNpmCommand(nodeArgs, commandArgs, target.task);

    return new Promise<void>((resolve, reject) => {
      const cp = spawn(npmCmd, npmArgs, {
        cwd: target.cwd,
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
          LAGE_PACKAGE_NAME: target.packageName,
        },
      });

      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}, pid: ${cp.pid}`, { target });

      NpmScriptRunner.activeProcesses.add(cp);

      logger.stream(LogLevel.verbose, cp.stdout, { target, pid: cp.pid });
      logger.stream(LogLevel.verbose, cp.stderr, { target, pid: cp.pid });

      let exitHandled = false;

      cp.on("exit", handleChildProcessExit);
      cp.on("error", () => handleChildProcessExit(1));

      function handleChildProcessExit(code: number) {
        if (exitHandled) {
          return;
        }

        cp.stdout.destroy();
        cp.stdin.destroy();

        if (code === 0) {
          NpmScriptRunner.activeProcesses.delete(cp);
          return resolve();
        }

        reject(false);
      }

      if (abortSignal) {
        abortSignal.addEventListener("aborted", () => {
          logger.verbose(`Abort signal detected, killing process id: ${cp.pid}}`, { target });
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
