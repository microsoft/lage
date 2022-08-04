import { Logger, LogLevel } from "@lage-run/logger";
import { spawn } from "child_process";
import { TargetRunner } from "../types/TargetRunner";
import type { ChildProcess } from "child_process";
import type { Target } from "@lage-run/target-graph";
import { WrappedTarget } from "../WrappedTarget";

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

  abort() {
    // first, send SIGTERM everywhere
    for (const cp of NpmScriptRunner.activeProcesses) {
      cp.kill("SIGTERM");
    }

    // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
    setTimeout(() => {
      for (const cp of NpmScriptRunner.activeProcesses) {
        if (!cp.killed) {
          cp.kill("SIGKILL");
        }
      }
    }, NpmScriptRunner.gracefulKillTimeout);
  }

  constructor(private options: NpmScriptRunnerOptions) {}

  private getNpmCommand(nodeArgs: string[], passThroughArgs: string[], task: string) {
    const extraArgs = passThroughArgs.length > 0 ? ["--", ...passThroughArgs] : [];
    return [...nodeArgs, "run", task, ...extraArgs];
  }

  run(target: Target) {
    const { logger, nodeArgs, commandArgs } = this.options;
    const { npmCmd } = NpmScriptRunner;

    const npmArgs = this.getNpmCommand(nodeArgs, commandArgs, target.task);

    return new Promise<boolean>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`, { target });

      const cp = spawn(npmCmd, npmArgs, {
        cwd: target.cwd,
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
          LAGE_PACKAGE_NAME: target.packageName,
        },
      });

      NpmScriptRunner.activeProcesses.add(cp);

      logger.stream(LogLevel.verbose, cp.stdout, { target });
      logger.stream(LogLevel.verbose, cp.stderr, { target });

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
          return resolve(true);
        }

        reject(false);
      }
    });
  }
}
