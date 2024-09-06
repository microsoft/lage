import type { Logger } from "@lage-run/logger";
import type { ILageService } from "@lage-run/rpc";
import { TargetRunnerPicker } from "@lage-run/runners";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import { getTargetId, type TargetGraph } from "@lage-run/target-graph";

export async function createLageService(targetGraph: TargetGraph, logger: Logger, npmClient: string): Promise<ILageService> {
  return {
    async runTarget(request) {
      const pickerOptions: TargetRunnerPickerOptions = {
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
      const runnerPicker = new TargetRunnerPicker(pickerOptions);

      if (!targetGraph.targets.has(getTargetId(request.packageName, request.task))) {
        logger.error(`Target not found: ${request.packageName}#${request.task}`);
        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
        };
      }
      const target = targetGraph.targets.get(getTargetId(request.packageName, request.task))!;

      const runner = await runnerPicker.pick(target);

      try {
        if (await runner.shouldRun(target)) {
          logger.info(`Running target ${request.packageName}#${request.task}`);
          await runner.run({
            target,
            weight: 0,
            abortSignal: new AbortController().signal,
          });
          logger.info(`Finished target ${request.packageName}#${request.task}`);
        }

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
