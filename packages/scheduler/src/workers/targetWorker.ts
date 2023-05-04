import { createCache } from "../cache/createCacheProvider.js";
import { getConfig } from "@lage-run/config";
import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker.js";
import { parentPort, workerData } from "worker_threads";
import createLogger from "@lage-run/logger";

import type { Target } from "@lage-run/target-graph";
import type { TargetRunnerPickerOptions } from "@lage-run/scheduler-types";

interface TargetWorkerDataOptions {
  runners: TargetRunnerPickerOptions;
  skipLocalCache: boolean;
  shouldCache: boolean;
  shouldResetCache: boolean;
  taskArgs: string[];
  root: string;
}

async function setup(options: TargetWorkerDataOptions) {
  const { runners, root } = options;

  const config = await getConfig(root);

  const logger = createLogger();
  logger.addReporter({
    log(entry) {
      parentPort!.postMessage({ type: "log", ...entry });
    },
    summarize() {},
  });

  const { cacheProvider, hasher } = await createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    cliArgs: options.taskArgs,
    skipLocalCache: options.skipLocalCache,
  });

  const runnerPicker = new TargetRunnerPicker(runners);

  return {
    options,
    runnerPicker,
    cacheProvider,
    hasher,
  };
}

(async () => {
  const { cacheProvider, hasher, runnerPicker, options } = await setup(workerData);

  async function getCache(target: Target) {
    const { shouldCache, shouldResetCache } = options;
    let hash: string | undefined = undefined;
    let cacheHit = false;

    if (!shouldCache || !target.cache || !cacheProvider || !hasher) {
      return { hash, cacheHit };
    }

    hash = await hasher.hash(target);

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

  async function run(data: any, abortSignal?: AbortSignal) {
    const { hash, cacheHit } = await getCache(data.target);

    const cacheEnabled = data.target.cache && options.shouldCache && hash;

    if (!cacheHit || !cacheEnabled) {
      const runner = await runnerPicker.pick(data.target);
      await runner.run({
        ...data,
        abortSignal,
      });

      await saveCache(data.target, hash);
    }

    return {
      skipped: cacheHit,
      hash,
    };
  }

  registerWorker(run);
})();
