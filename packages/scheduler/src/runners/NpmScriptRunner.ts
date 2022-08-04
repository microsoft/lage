import { spawn } from "child_process";
import { Logger, LogLevel } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import type { ChildProcess } from "child_process";

export interface NpmScriptRunnerOptions {
  logger: Logger;
  commandArgs: string[];
  nodeArgs: string[];
  npmCmd: string;
}

export class NpmScriptRunner {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];

  static killAllActiveProcesses() {
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

    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

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

      logger.stream(LogLevel.verbose, cp.stdout);
      logger.stream(LogLevel.verbose, cp.stderr);

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          NpmScriptRunner.activeProcesses.delete(cp);
          return resolve();
        }

        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }
}
