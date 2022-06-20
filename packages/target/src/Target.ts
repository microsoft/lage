import { Logger, LogLevel } from "@lage-run/logger";
import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import { TargetLogWritable } from "./TargetLogWritable";

export interface TargetDefinition {
  id: string;
  label: string;
  package: string;
  cwd: string;

  outputs?: string[];
  inputs?: string[];

  color?: boolean;
  args?: string[];
  env?: Record<string, string | undefined>;

  cmd: string;

  onStart?: (target: Target) => void;
  onComplete?: (target: Target) => void;
  onFail?: (target: Target, childProcess: ChildProcess) => void;
  onSkip?: (target: Target) => void;
}

export class Target {
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];

  constructor(private options: TargetDefinition, private logger: Logger) {
    this.options.color = this.options.color ?? Boolean(process.stdout.isTTY);
    this.options.env = this.options.env ?? process.env;
    this.options.outputs = this.options.outputs ?? ["!node_modules/**/*"];
  }

  run() {
    const { cmd, args = [], cwd, env } = this.options;
    const { logger } = this;

    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[cmd, ...args].join(" ")}`);
      this.startTime = process.hrtime();

      const cp = spawn(cmd, args, {
        cwd: cwd ?? process.cwd(),
        env: {
          ...process.env,
          ...env,
        },
        stdio: [
          "ignore",
          new TargetLogWritable(LogLevel.verbose, logger),
          new TargetLogWritable(LogLevel.verbose, logger),
        ],
      });

      cp.on("exit", (code, signal) => {
        if (code === 0) {
          this.duration = process.hrtime(this.startTime);

          if (this.options.onComplete) {
            this.options.onComplete(this);
          }

          return resolve();
        }
      });

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          return resolve();
        }

        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }
}
