import { cacheFetch, cacheHash, cachePut } from "../cache/backfill";
import { Config } from "../types/Config";
import { getDepsForTarget } from "../task/getDepsForTarget";
import { getPackageAndTask } from "../task/taskId";
import { getWorkspace } from "../workspace/getWorkspace";
import { WorkerQueue, WorkerQueueJob } from "../task/WorkerQueue";
import { logger } from "../logger";
import { Pipeline, START_TARGET_ID } from "../task/Pipeline";
import { PipelineTarget } from "../types/PipelineDefinition";
import { TaskLogger } from "../logger/TaskLogger";
import pLimit from "p-limit";

/** Arbitrary parallel limit for network downloads of caches */
const NetworkParallelLimit = 15;

/** Worker command */
export async function worker(cwd: string, config: Config) {
  logger.verbose("worker started");

  const workspace = getWorkspace(cwd, config);
  const pipeline = new Pipeline(workspace, config);
  const networkLimit = pLimit(NetworkParallelLimit);

  /** the worker queue processor */
  const processor = async (job: WorkerQueueJob) => {
    const id = job.name;
    const { packageName, task } = getPackageAndTask(id);

    if (!pipeline.targets!.has(id)) {
      logger.info(`pipeline doesn't have  ${id}`);
      return;
    }

    const target = pipeline.targets.get(id)!;
    const deps = getDepsForTarget(id, pipeline.dependencies);
    const taskLogger = new TaskLogger(packageName || "[GLOBAL]", task);

    taskLogger.info(`[${job.id}] started`);

    // Step 1. Fetch all dependent cached outputs
    await Promise.all(
      deps
        .filter((d) => d !== START_TARGET_ID)
        .map((depTargetId: string) => {
          return networkLimit(() => getCache(pipeline.targets.get(depTargetId)!, workspace.root, config));
        })
    );

    taskLogger.info(`[${job.id}] restored all dependent cache`);

    // Step 2. Fetch this job cache (maybe from a previous run)
    const cacheResult = await getCache(target, workspace.root, config);

    if (cacheResult.cacheHit) {
      taskLogger.info(`[${job.id}] skipped`);
      return { hash: cacheResult.hash, id: target.id, cwd: target.cwd, outputGlob: target.outputGlob };
    }

    // Step 3. Try running the task based on the target ID from the queue
    try {
      let result: Promise<unknown> | void;

      if (target.run) {
        if (target.packageName) {
          result = target.run({
            packageName: target.packageName,
            config,
            cwd: target.cwd,
            options: target.options,
            taskName: getPackageAndTask(target.id).task,
            logger: taskLogger,
          });
        } else {
          result = target.run({
            config,
            cwd: target.cwd,
            options: target.options,
            logger: taskLogger,
          });
        }
      }

      if (result && typeof result["then"] === "function") {
        await result;
      }

      // Step 4. Save the cache remotely (unconditionally)
      await saveCache(cacheResult.hash, target, config);

      taskLogger.info(`[${job.id}] done`);

      return { hash: cacheResult.hash, id: target.id, cwd: target.cwd, outputGlob: target.outputGlob };
    } catch (e) {
      // Step 4a. If there is an error, we report the output in a message as an Error. This gets sent
      //          across the redis server via the queue, so there will be a size limit to it
      taskLogger.error(`[${job.id}] failed`);
      throw new Error(
        taskLogger
          .getLogs()
          .map((e) => e.msg)
          .join("\n")
      );
    }
  };

  // After all the setup, we initialize the worker processor with the queue library
  const workerQueue = new WorkerQueue(config);
  await workerQueue.initializeAsWorker(processor);

  logger.verbose("worker queue initialized");
}

/********************************************
 * Utilities to support caching of the worker
 *********************************************/

/**
 *
 * @param target
 * @param config
 * @returns
 */
function getCacheOptions(target: PipelineTarget, config: Config) {
  return {
    ...config.cacheOptions,
    outputGlob: target.outputGlob || config.cacheOptions.outputGlob,
  };
}

async function getCache(target: PipelineTarget, root: string, config: Config) {
  let hash: string | null = null;
  let cacheHit = false;

  const { id, cwd } = target;
  const cacheOptions = getCacheOptions(target, config);
  hash = await cacheHash(id, root, cwd, cacheOptions, config.args);

  if (hash && !config.resetCache) {
    cacheHit = await cacheFetch(hash, id, cwd, config.cacheOptions);
  }

  return { hash, cacheHit };
}

async function saveCache(hash: string | null, target: PipelineTarget, config: Config) {
  const cacheOptions = getCacheOptions(target, config);
  await cachePut(hash, target.cwd, cacheOptions);
}
