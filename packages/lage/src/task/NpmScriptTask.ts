import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { PackageInfo } from "workspace-tools";
import { spawn } from "child_process";
import path from "path";
import { getNpmCommand } from "./getNpmCommand";
import { Config } from "../types/Config";
import { LogLevel } from "../logger/LogLevel";

export class NpmScriptTask {
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

  constructor(public task: string, public info: PackageInfo, private config: Config, private logger: TaskLogger) {
    this.npmArgs = getNpmCommand(config.node, config.args, task);
  }

  run() {
    const { info, logger, npmArgs } = this;
    const npmCmd = this.config.npmClient;
    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

      const cp = spawn(npmCmd, npmArgs, {
        cwd: path.dirname(info.packageJsonPath),
        stdio: "pipe",
        // This is required for Windows due to https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
        shell: true,
        env: {
          ...(process.stdout.isTTY && !this.config.reporter.includes("json") && { FORCE_COLOR: "1" }), // allow user env to override this
          ...process.env,
          LAGE_PACKAGE_NAME: info.name,
        },
      });

      NpmScriptTask.activeProcesses.add(cp);

      this.logger.stream(LogLevel.verbose, cp.stdout);
      this.logger.stream(LogLevel.verbose, cp.stderr);
      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          NpmScriptTask.activeProcesses.delete(cp);
          return resolve();
        }

        logger.verbose(`Exiting ${[npmCmd, ...npmArgs].join(" ")} with exit code ${code}`);
        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }
}
