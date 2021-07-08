import { getWorkspace } from "../workspace/getWorkspace";
import { Config } from "../types/Config";
import { Reporter } from "../logger/reporters/Reporter";
import { initWorkerQueue } from "../task/workerQueue";
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
  const workerQueue = await initWorkerQueue(config.workerQueueOptions);

  workerQueue.ready(() => {
    async function checkActive() {
      const counts = await workerQueue.checkHealth();
      const isRunning = (counts.active + counts.delayed + counts.waiting) > 0;
      if (!isRunning) {
        workerQueue.close();
      } else {
        setTimeout(checkActive, 2000);
      }
    }

    checkActive();

    workerQueue.process(config.concurrency, async (job, done) => {
      console.log(`processing job ${job.id}: ${job.data.name} ${job.data.task}`);

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

      const cacheResult = await getCache({
        task: job.data.task,
        name: job.data.name,
        root: cwd,
        packagePath: path.join(cwd, job.data.packagePath),
        config,
      });

      if (cacheResult.cacheHit) {
        return done();
      }

      const { npmArgs, spawnOptions, packagePath } = job.data;
      const npmCmd = findNpmClient(config.npmClient);

      const cp = spawn(npmCmd, npmArgs, {
        cwd: path.join(cwd, packagePath),
        ...spawnOptions,
      });

      const logger = new TaskLogger(job.data.name, job.data.task);

      const stdoutLogger = new TaskLogWritable(logger);
      cp.stdout.pipe(stdoutLogger);

      const stderrLogger = new TaskLogWritable(logger);
      cp.stderr.pipe(stderrLogger);

      cp.on("exit", async () => {
        await saveCache(cacheResult.hash, {
          task: job.data.task,
          name: job.data.name,
          root: cwd,
          packagePath: job.data.packagePath,
          config,
        });

        done();
      });
    });
  });
}

// speeding up to reduce network costs for a worker
const localHashCache: { [packageTask: string]: string } = {};

async function getCache(options: any) {
  let hash: string | null = null;
  let cacheHit = false;

  const { task, name, root, packagePath, config } = options;

  const localCacheKey = getTaskId(name, task);

  if (localHashCache[localCacheKey]) {
    return { hash: localHashCache[localCacheKey], cacheHit: true };
  }

  if (config.cache) {
    hash = await cacheHash(task, name, root, packagePath, config.cacheOptions, config.passThroughArgs);
    if (hash && !config.resetCache) {
      cacheHit = await cacheFetch(hash, task, name, packagePath, config.cacheOptions);

      if (cacheHit) {
        localHashCache[localCacheKey] = hash;
      }
    }
  }

  return { hash, cacheHit };
}

async function saveCache(hash: string | null, options: any) {
  const { logger, packagePath, config } = options;
  await cachePut(hash, packagePath, config.cacheOptions);
}
