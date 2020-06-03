import { abort } from "./abortSignal";
import { Config } from "../types/Config";
import { findNpmClient } from "./findNpmClient";
import { getTaskId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { spawn } from "child_process";
import { taskWrapper } from "./taskWrapper";
import logger, { NpmLogWritable } from "../logger";
import path from "path";
import { PackageInfo } from "workspace-tools";

function wait(time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

let npmCmd: string;

export function npmTask(
  task: string,
  info: PackageInfo,
  context: RunContext,
  config: Config
) {
  const { queue, events, measures } = context;
  const { node, args, npmClient } = config;

  const taskId = getTaskId(info.name, task);

  // cached npmCmd
  npmCmd = npmCmd || findNpmClient(npmClient);

  const npmArgs = [...node, "run", task, "--", ...args];

  return queue.add(() =>
    taskWrapper(
      taskId,
      () =>
        new Promise((resolve, reject) => {
          if (!info.scripts || !info.scripts![task]) {
            logger.info(taskId, `Empty script detected, skipping`);
            return resolve();
          }

          logger.verbose(taskId, `Running ${[npmCmd, ...npmArgs].join(" ")}`);

          const cp = spawn(npmCmd, npmArgs, {
            cwd: path.dirname(info.packageJsonPath),
            stdio: "pipe",
          });

          events.once("abort", terminate);

          const stdoutLogger = new NpmLogWritable(taskId);
          cp.stdout.pipe(stdoutLogger);

          const stderrLogger = new NpmLogWritable(taskId);
          cp.stderr.pipe(stderrLogger);

          cp.on("exit", (code) => {
            events.off("off", terminate);

            if (code === 0) {
              return resolve();
            }

            measures.failedTask = taskId;

            abort(context);
            reject();
          });

          function terminate() {
            queue.pause();
            queue.clear();
            cp.kill("SIGKILL");
          }
        }).then(() => wait(100)),
      context
    )
  );
}
