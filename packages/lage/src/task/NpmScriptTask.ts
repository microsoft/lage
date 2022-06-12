import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { PackageInfo } from "workspace-tools";
import { findNpmClient } from "../workspace/findNpmClient";
import { spawn } from "child_process";
import path from "path";
import { TaskLogWritable } from "../logger/TaskLogWritable";

import { getNpmCommand } from "./getNpmCommand";
import { Config } from "../types/Config";

export class NpmScriptTask {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];

  static killAllActiveProcesses() {
    // first, send SIGTERM everywhere
    for (const cp of NpmScriptTask.activeProcesses) {
      cp.kill("SIGTERM");
    }

    // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
    setTimeout(() => {
      for (const cp of NpmScriptTask.activeProcesses) {
        if (!cp.killed) {
          cp.kill("SIGKILL");
        }
      }
    }, NpmScriptTask.gracefulKillTimeout);
  }

  constructor(
    public task: string,
    public info: PackageInfo,
    private config: Config,
    private logger: TaskLogger
  ) {
    NpmScriptTask.npmCmd =
      NpmScriptTask.npmCmd || findNpmClient(config.npmClient);
    this.npmArgs = getNpmCommand(config.node, config.args, task);
  }

  run() {
    const { info, logger, npmArgs } = this;
    const { npmCmd } = NpmScriptTask;
    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

      const cp = spawn(npmCmd, npmArgs, {
        cwd: path.dirname(info.packageJsonPath),
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY &&
            this.config.reporter !== "json" && { FORCE_COLOR: "1" }),
          LAGE_PACKAGE_NAME: info.name,
        },
      });

      NpmScriptTask.activeProcesses.add(cp);

      const stdoutLogger = new TaskLogWritable(this.logger);
      cp.stdout.pipe(stdoutLogger);

      const stderrLogger = new TaskLogWritable(this.logger);
      cp.stderr.pipe(stderrLogger);

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          NpmScriptTask.activeProcesses.delete(cp);
          return resolve();
        }

        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }
}
