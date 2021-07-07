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
import os from 'os';

// Run multiple
export async function worker(cwd: string, config: Config, reporters: Reporter[]) {
  const workspace = getWorkspace(cwd, config);
  const workerQueue = initWorkerQueue(config.workerQueueOptions);

  workerQueue.process(config.concurrency, async (job, done) => {
    console.log(`processing job ${job.id}`);

    await Promise.all(
      job.data.taskDeps.map((taskDep: string) => {
        const [name, task] = taskDep.split("#");

        if (task) {
          const info = workspace.allPackages[name];
          const packagePath = path.dirname(info.packageJsonPath);

          console.log(`retrieving cache for ${taskDep}`);

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
}

async function getCache(options: any) {
  let hash: string | null = null;
  let cacheHit = false;

  const { task, name, root, packagePath, config } = options;

  if (config.cache) {
    hash = await cacheHash(task, name, root, packagePath, config.cacheOptions, config.passThroughArgs);
    if (hash && !config.resetCache) {
      cacheHit = await cacheFetch(hash, task, name, packagePath, config.cacheOptions);
    }
  }

  return { hash, cacheHit };
}

async function saveCache(hash: string | null, options: any) {
  const { logger, packagePath, config } = options;
  await cachePut(hash, packagePath, config.cacheOptions);
}
