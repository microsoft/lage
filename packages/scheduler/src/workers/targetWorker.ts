import { createCache } from "../cache/createCacheProvider.js";
import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "@lage-run/runners";
import { parentPort, workerData } from "worker_threads";
import createLogger from "@lage-run/logger";

import type { CacheOptions } from "@lage-run/config";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";

interface TargetWorkerDataOptions {
  runners: TargetRunnerPickerOptions;
  skipLocalCache: boolean;
  shouldCache: boolean;
  shouldResetCache: boolean;
  taskArgs: string[];
  root: string;
  cacheOptions?: CacheOptions;
}

function setup(options: TargetWorkerDataOptions) {
  const { runners, root, cacheOptions } = options;

  const logger = createLogger();
  logger.addReporter({
    log(entry) {
      parentPort!.postMessage({ type: "log", ...entry });
    },
    summarize() {},
  });

  const { cacheProvider } = createCache({
    root,
    logger,
    cacheOptions,
    skipLocalCache: options.skipLocalCache,
  });

  const runnerPicker = new TargetRunnerPicker(runners);

  return {
    options,
    runnerPicker,
    cacheProvider,
  };
}

const { cacheProvider, runnerPicker, options } = setup(workerData);

async function getCache(target: Target, hash: string | undefined) {
  const { shouldCache, shouldResetCache } = options;
  let cacheHit = false;

  if (!shouldCache || !target.cache || !cacheProvider) {
    return { hash: undefined, cacheHit };
  }

  if (hash && !shouldResetCache) {
    cacheHit = await cacheProvider.fetch(hash, target);
  }

  return { hash, cacheHit };
}

async function saveCache(target: Target, hash: string | undefined) {
  if (!hash || !cacheProvider) {
    return;
  }
  await cacheProvider.put(hash, target);
}

async function run(data: { target: Target; hash?: string; weight: number }, abortSignal?: AbortSignal) {
  const { hash, cacheHit } = await getCache(data.target, data.hash);

  const cacheEnabled = data.target.cache && options.shouldCache && hash;

  let value: unknown = undefined;
  if (!cacheHit || !cacheEnabled) {
    const runner = await runnerPicker.pick(data.target);
    value = await runner.run({
      ...data,
      abortSignal,
    });

    await saveCache(data.target, hash);
  }

  return {
    skipped: cacheHit,
    id: data.target.id,
    hash,
    value,
  };
}

registerWorker(run);
