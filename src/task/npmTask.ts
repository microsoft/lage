import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { spawn } from "child_process";
import path from "path";

import { RunContext } from "../types/RunContext";
import logger, { NpmLogWritable } from "../logger";
import { taskWrapper } from "./taskWrapper";
import { abort } from "./abortSignal";

function wait(time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

export function npmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages, queue, npmCmd } = context;

  const npmArgs = [...context.node, "run", task, "--", ...context.args];

  return queue.add(() =>
    taskWrapper(
      taskId,
      () =>
        new Promise((resolve, reject) => {
          if (!allPackages[pkg].scripts || !allPackages[pkg].scripts![task]) {
            logger.info(taskId, `Empty script detected, skipping`);
            return resolve();
          }

          logger.verbose(taskId, `Running ${[npmCmd, ...npmArgs].join(" ")}`);

          const cp = spawn(npmCmd, npmArgs, {
            cwd: path.dirname(allPackages[pkg].packageJsonPath),
            stdio: "pipe",
          });

          context.events.once("abort", terminate);

          const stdoutLogger = new NpmLogWritable(taskId);
          cp.stdout.pipe(stdoutLogger);

          const stderrLogger = new NpmLogWritable(taskId);
          cp.stderr.pipe(stderrLogger);

          cp.on("exit", (code) => {
            context.events.off("off", terminate);

            if (code === 0) {
              return resolve();
            }

            context.measures.failedTask = taskId;

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
