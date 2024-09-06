import type { Logger } from "@lage-run/logger";
import type { ILageService } from "@lage-run/rpc";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import { getTargetId, type TargetGraph } from "@lage-run/target-graph";

export async function createLageService(
  targetGraph: TargetGraph,
  logger: Logger,
  npmClient: string,
  maxWorkers?: number
): Promise<ILageService> {
  const poolModule = (await import("@lage-run/worker-threads-pool")).default;
  const pool = new poolModule.WorkerPool({
    script: require.resolve("./singleTargetWorker.js"),
    maxWorkers,
  });

  return {
    async runTarget(request) {
      const runners: TargetRunnerPickerOptions = {
        npmScript: {
          script: require.resolve("../run/runners/NpmScriptRunner.js"),
          options: {
            nodeOptions: request.nodeOptions,
            taskArgs: request.taskArgs,
            npmCmd: npmClient,
          },
        },
        worker: {
          script: require.resolve("../run/runners/WorkerRunner.js"),
          options: {
            taskArgs: request.taskArgs,
          },
        },
        noop: {
          script: require.resolve("../run/runners/NoOpRunner.js"),
          options: {},
        },
      };

      if (!targetGraph.targets.has(getTargetId(request.packageName, request.task))) {
        logger.error(`Target not found: ${request.packageName}#${request.task}`);
        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
        };
      }

      const target = targetGraph.targets.get(getTargetId(request.packageName, request.task))!;
      const task = {
        target,
        runners,
      };

      try {
        await pool.exec(task, 0, (_worker, stdout, stderr) => {
          stdout.pipe(process.stdout);
          stderr.pipe(process.stderr);
        });

        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 0,
        };
      } catch (e) {
        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
        };
      }
    },
  };
}
