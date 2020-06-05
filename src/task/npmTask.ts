import { Config } from "../types/Config";
import { controller, signal } from "./abortSignal";
import { findNpmClient } from "../workspace/findNpmClient";
import { PackageInfo } from "workspace-tools";
import { RunContext } from "../types/RunContext";
import { spawn } from "child_process";
import { taskLogger, NpmLogWritable } from "../logger";
import { taskWrapper } from "./taskWrapper";
import path from "path";
import PQueue from "p-queue";

function wait(time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

let npmCmd: string;
let queue: PQueue;

export function npmTask(
  task: string,
  info: PackageInfo,
  config: Config,
  context: RunContext
) {
  const { node, args, npmClient, concurrency } = config;

  const logger = taskLogger(info.name, task);

  // cached npmCmd
  queue = queue || new PQueue({ concurrency });
  npmCmd = npmCmd || findNpmClient(npmClient);

  const npmArgs = [...node, "run", task, "--", ...args];

  return queue.add(() =>
    taskWrapper(
      info,
      task,
      () =>
        new Promise((resolve, reject) => {
          if (!info.scripts || !info.scripts![task]) {
            logger.info(`Empty script detected, skipping`);
            return resolve();
          }

          logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

          const cp = spawn(npmCmd, npmArgs, {
            cwd: path.dirname(info.packageJsonPath),
            stdio: "pipe",
          });

          signal.addEventListener("abort", terminate);

          const stdoutLogger = new NpmLogWritable(info.name, task);
          cp.stdout.pipe(stdoutLogger);

          const stderrLogger = new NpmLogWritable(info.name, task);
          cp.stderr.pipe(stderrLogger);

          cp.on("exit", (code) => {
            signal.removeEventListener("abort", terminate);

            if (code === 0) {
              return resolve();
            }

            controller.abort();
            reject();
          });

          function terminate() {
            queue.pause();
            queue.clear();
            cp.kill("SIGKILL");
          }
        }).then(() => wait(100)),
      config,
      context
    )
  );
}
