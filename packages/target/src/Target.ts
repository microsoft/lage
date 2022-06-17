import type { ChildProcess } from "child_process";
import { Logger, LogLevel } from "@lage-run/logger";
import { spawn } from "child_process";
import { TargetLogWritable } from "./TargetLogWritable";

export interface TargetOptions {
  cwd: string;
  cmd: string;
  args?: string[];
  env?: Record<string, string>;
}

export class Target {
  static cmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];

  static killAllActiveProcesses() {
    // first, send SIGTERM everywhere
    for (const cp of Target.activeProcesses) {
      cp.kill("SIGTERM");
    }

    // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
    setTimeout(() => {
      for (const cp of Target.activeProcesses) {
        if (!cp.killed) {
          cp.kill("SIGKILL");
        }
      }
    }, Target.gracefulKillTimeout);
  }

  constructor(private options: TargetOptions, private logger: Logger) {}

  run() {
    const { cmd, args = [], cwd, env } = this.options;
    const { logger } = this;

    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[cmd, ...args].join(" ")}`);

      const cp = spawn(cmd, args, {
        cwd: cwd ?? process.cwd(),
        env: {
          ...process.env,
          ...env,
        },
        stdio: ["ignore", new TargetLogWritable(LogLevel.verbose, logger), "inherit"],
      });

      Target.activeProcesses.add(cp);

      const stdoutLogger = new TargetLogWritable(LogLevel.verbose, this.logger);
      cp.stdout.pipe(stdoutLogger);

      const stderrLogger = new TargetLogWritable(LogLevel.verbose, this.logger);
      cp.stderr.pipe(stderrLogger);

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          Target.activeProcesses.delete(cp);
          return resolve();
        }

        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }
}
