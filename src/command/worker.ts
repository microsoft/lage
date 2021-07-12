import { getWorkspace } from "../workspace/getWorkspace";
import { Config } from "../types/Config";
import { Reporter } from "../logger/reporters/Reporter";
import { initWorkerQueue, workerPubSubChannel } from "../task/workerQueue";
import { spawn } from "child_process";
import * as path from "path";
import { findNpmClient } from "../workspace/findNpmClient";
import { TaskLogWritable } from "../logger/TaskLogWritable";
import { TaskLogger } from "../logger/TaskLogger";
import { cacheFetch, cacheHash, cachePut } from "../cache/backfill";
import { getTaskId } from "@microsoft/task-scheduler";

// Run multiple
export async function worker(cwd: string, config: Config, reporters: Reporter[]) {
  const workspace = getWorkspace(cwd, config);
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
    workerQueue.process(config.concurrency, (job, done) => {
      // Async-IIFE here because we don't want the actual return of the processor handler to return a promise.
      (async () => {
        const logger = new TaskLogger(job.data.name, job.data.task);

        logger.info(`processing job ${job.id}`);

        await Promise.all(
          job.data.taskDeps.map((taskDep: string) => {
            const [name, task] = taskDep.split("#");

            if (task) {
              const info = workspace.allPackages[name];
              const packagePath = path.dirname(info.packageJsonPath);
              return getCache({
                task,
                name,
                root: cwd,
                packagePath,
                config,
              });
            }
          })
        );

        let cacheResult: { hash: string; cacheHit: boolean };

        if (config.cache) {
          const cacheResult = await getCache({
            task: job.data.task,
            name: job.data.name,
            root: cwd,
            packagePath: path.join(cwd, job.data.packagePath),
            config,
          });

          if (cacheResult.cacheHit) {
            logger.info(`skipped ${job.data.name}.${job.data.task}`);
            return done();
          }
        }

        const { npmArgs, spawnOptions, packagePath } = job.data;
        const npmCmd = findNpmClient(config.npmClient);

        const cp = spawn(npmCmd, npmArgs, {
          cwd: path.join(cwd, packagePath),
          ...spawnOptions,
        });

        const stdoutLogger = new TaskLogWritable(logger);
        cp.stdout.pipe(stdoutLogger);

        const stderrLogger = new TaskLogWritable(logger);
        cp.stderr.pipe(stderrLogger);

        cp.on("exit", async (code) => {
          if (config.cache && cacheResult) {
            await saveCache(cacheResult.hash, {
              task: job.data.task,
              name: job.data.name,
              root: cwd,
              packagePath: job.data.packagePath,
              config,
              logger,
            });
          }

          logger.info(`exiting with code: ${code}`);

          done();
        });
      })();
    });
  });
}

// speeding up to reduce network costs for a worker
const localHashCache: { [packageTask: string]: string | null } = {};

async function getCache(options: any) {
  let hash: string | null = null;
  let cacheHit = false;

  const { task, name, root, packagePath, config } = options;

  const localCacheKey = getTaskId(name, task);

  if (localHashCache[localCacheKey]) {
    return { hash: localHashCache[localCacheKey], cacheHit: true };
  }

  hash = await cacheHash(task, name, root, packagePath, config.cacheOptions, config.passThroughArgs);
  if (hash && !config.resetCache) {
    cacheHit = await cacheFetch(hash, task, name, packagePath, config.cacheOptions);

    if (cacheHit) {
      localHashCache[localCacheKey] = hash;
    }
  }

  return { hash, cacheHit };
}

async function saveCache(hash: string | null, options: any) {
  const { task, name, logger, packagePath, config } = options;
  const localCacheKey = getTaskId(name, task);

  localHashCache[localCacheKey] = hash;

  logger.info(`put ${hash}`);
  await cachePut(hash, packagePath, config.cacheOptions);
}
