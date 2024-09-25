import { type ConfigOptions, getConfig, type PipelineDefinition } from "@lage-run/config";
import type { Logger } from "@lage-run/logger";
import type { ILageService } from "@lage-run/rpc";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import { getTargetId, type TargetGraph } from "@lage-run/target-graph";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { getPackageAndTask } from "@lage-run/target-graph";
import { type Readable } from "stream";
import { WorkerPool } from "@lage-run/worker-threads-pool";

function findAllTasks(pipeline: PipelineDefinition) {
  const tasks = new Set<string>();
  for (const key of Object.keys(pipeline)) {
    if (key.includes("#") || key.startsWith("#") || key.endsWith("//")) {
      const { task } = getPackageAndTask(key);
      tasks.add(task);
    } else {
      tasks.add(key);
    }
  }
  return Array.from(tasks);
}

let targetGraph: TargetGraph | undefined;
let config: ConfigOptions | undefined;

async function initializeOnce(cwd: string, logger: Logger) {
  if (!config) {
    config = await getConfig(cwd);
  }

  if (!targetGraph) {
    const { pipeline } = config;
    const root = getWorkspaceRoot(cwd)!;
    const packageInfos = getPackageInfos(root);
    const tasks = findAllTasks(pipeline);
    targetGraph = createTargetGraph({
      logger,
      root,
      dependencies: false,
      dependents: false,
      ignore: [],
      pipeline,
      repoWideChanges: config.repoWideChanges,
      scope: [],
      since: "",
      outputs: config.cacheOptions.outputGlob,
      tasks,
      packageInfos,
    });
  }
  return { config, targetGraph };
}

let pool: WorkerPool | undefined;

export async function createLageService(
  cwd: string,
  abortController: AbortController,
  logger: Logger,
  maxWorkers?: number
): Promise<ILageService> {
  logger.info(`Server started with ${maxWorkers} workers`);

  pool = new WorkerPool({
    script: require.resolve("./singleTargetWorker.js"),
    maxWorkers,
  });

  abortController.signal.addEventListener("abort", () => {
    pool?.close();
  });

  return {
    async ping() {
      return { pong: true };
    },

    async runTarget(request) {
      const { config, targetGraph } = await initializeOnce(cwd, logger);

      const runners: TargetRunnerPickerOptions = {
        npmScript: {
          script: require.resolve("../run/runners/NpmScriptRunner.js"),
          options: {
            nodeOptions: request.nodeOptions,
            taskArgs: request.taskArgs,
            npmCmd: config.npmClient,
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

      let pipedStdout: Readable;
      let pipedStderr: Readable;

      try {
        const results = (await pool!.exec(
          task,
          0,
          (worker, stdout, stderr) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} start`);
            pipedStdout = stdout;
            pipedStderr = stderr;
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
          },
          (worker) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} end`);
            pipedStdout.unpipe(process.stdout);
            pipedStderr.unpipe(process.stderr);
          }
        )) as { hash?: string; id: string };

        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 0,
          hash: results?.hash,
          id: results?.id,
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
