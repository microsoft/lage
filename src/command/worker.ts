import { getWorkspace } from "../workspace/getWorkspace";
import { Config } from "../types/Config";
import { Reporter } from "../logger/reporters/Reporter";
import { initWorkerQueueAsWorker } from "../task/workerQueue";
import { TaskLogger } from "../logger/TaskLogger";
import { cacheFetch, cacheHash, cachePut } from "../cache/backfill";
import { Pipeline, START_TARGET_ID } from "../task/Pipeline";
import { getPackageAndTask } from "../task/taskId";
import { PipelineTarget } from "../types/PipelineDefinition";
import { logger } from "../logger";
import pLimit from "p-limit";
import { Job } from "bullmq";

// Run multiple
export async function worker(cwd: string, config: Config, reporters: Reporter[]) {
  logger.verbose("worker started");

  const workspace = getWorkspace(cwd, config);
  const pipeline = new Pipeline(workspace, config);
  const networkLimit = pLimit(15);

  /** the bullmq worker processor */
  const processor = async (job: Job) => {
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

    await Promise.all(
      deps
        .filter((d) => d !== START_TARGET_ID)
        .map((depTargetId: string) => {
          return networkLimit(() => getCache(pipeline.targets.get(depTargetId)!, workspace.root, config));
        })
    );

    taskLogger.info(`[${job.id}] restored all dependent cache`);

    const cacheResult = await getCache(target, workspace.root, config);

    if (cacheResult.cacheHit) {
      taskLogger.info(`[${job.id}] skipped`);
      return { hash: cacheResult.hash, id: target.id, cwd: target.cwd, outputGlob: target.outputGlob };
    }

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

      await saveCache(cacheResult.hash, target, config);

      taskLogger.info(`[${job.id}] done`);

      return { hash: cacheResult.hash, id: target.id, cwd: target.cwd, outputGlob: target.outputGlob };
    } catch (e) {
      taskLogger.error(`[${job.id}] failed`);
      throw new Error(
        taskLogger
          .getLogs()
          .map((e) => e.msg)
          .join("\n")
      );
    }
  };

  await initWorkerQueueAsWorker(processor, config);

  logger.verbose("worker queue initialized");
}

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

function getDepsForTarget(id: string, dependencies: [string, string][]) {
  const stack = [id];
  const deps = new Set<string>();
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (current !== id) {
      deps.add(current);
    }

    dependencies.forEach(([from, to]) => {
      if (to === current) {
        stack.push(from);
      }
    });
  }

  return [...deps];
}
