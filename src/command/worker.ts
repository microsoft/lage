import { getWorkspace } from "../workspace/getWorkspace";
import { Config } from "../types/Config";
import { Reporter } from "../logger/reporters/Reporter";
import { initWorkerQueue, workerPubSubChannel } from "../task/workerQueue";
import { TaskLogger } from "../logger/TaskLogger";
import { cacheFetch, cacheHash, cachePut } from "../cache/backfill";
import { Pipeline, START_TARGET_ID } from "../task/Pipeline";
import { getPackageAndTask } from "../task/taskId";
import { PipelineTarget } from "../types/PipelineDefinition";

// Run multiple
export async function worker(cwd: string, config: Config, reporters: Reporter[]) {
  const workspace = getWorkspace(cwd, config);

  const pipeline = new Pipeline(workspace, config);

  const { workerQueue, redisClient } = await initWorkerQueue(config.workerQueueOptions);

  const pubSubListener = (channel, message) => {
    if (workerPubSubChannel === channel) {
      if (message === "done") {
        workerQueue.close();
        redisClient.off("message", pubSubListener);
        redisClient.unsubscribe(workerPubSubChannel);
        redisClient.quit();
      }
    }
  };

  redisClient.subscribe(workerPubSubChannel);
  redisClient.on("message", pubSubListener);

  workerQueue.ready(() => {
    workerQueue.process(config.concurrency, async(job) => {
        const id = job.data.id;

        if (!pipeline.targets!.has(id)) {
          return;
        }

        const target = pipeline.targets.get(id)!;

        const deps = getDepsForTarget(id, pipeline.dependencies);

        const logger = new TaskLogger(job.data.name, job.data.task);

        logger.info(`processing job ${job.id}`);

        await Promise.all(
          deps.filter(d => d !== START_TARGET_ID).map((depTargetId: string) => {
            return getCache(pipeline.targets.get(depTargetId)!, workspace.root, config);
          })
        );

        const cacheResult = await getCache(target, workspace.root, config);

        if (cacheResult.cacheHit) {
          logger.info(`skipped ${id}`);
          return;
        }

        let result: Promise<unknown> | void;

        if (target.packageName) {
          result = target.run({
            packageName: target.packageName,
            config,
            cwd: target.cwd,
            options: target.options,
            taskName: getPackageAndTask(target.id).task,
            logger,
          });
        } else {
          result = target.run({
            config,
            cwd: target.cwd,
            options: target.options,
            logger,
          });
        }

        if (result && typeof result["then"] === "function") {
          await result;
        }

        await saveCache(cacheResult.hash, target, config);
    });
  });
}

// speeding up to reduce network costs for a worker
const localHashCache: { [packageTask: string]: string | null } = {};

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

  if (localHashCache[id]) {
    return { hash: localHashCache[id], cacheHit: true };
  }

  const cacheOptions = getCacheOptions(target, config);
  hash = await cacheHash(id, root, cwd, cacheOptions, config.args);

  if (hash && !config.resetCache) {
    cacheHit = await cacheFetch(hash, id, cwd, config.cacheOptions);

    if (cacheHit) {
      localHashCache[id] = hash;
    }
  }

  return { hash, cacheHit };
}

async function saveCache(hash: string | null, target: PipelineTarget, config: Config) {
  const localCacheKey = target.id;
  localHashCache[localCacheKey] = hash;

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
