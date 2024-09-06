import os from "os";
import { readConfigFile } from "./readConfigFile.js";
import type { ConfigOptions } from "./types/ConfigOptions.js";
import type { CacheOptions } from "./types/CacheOptions.js";

/**
 * Get the lage config with defaults.
 */
export async function getConfig(cwd: string): Promise<ConfigOptions> {
  const config = (await readConfigFile(cwd)) || ({} as Partial<ConfigOptions>);
  const availableParallelism = "availableParallelism" in os ? (os as any)["availableParallelism"]() : os.cpus().length - 1;
  return {
    cacheOptions: config?.cacheOptions ?? ({} as CacheOptions),
    ignore: config?.ignore ?? [],
    npmClient: config?.npmClient ?? "npm",
    pipeline: config?.pipeline ?? {},
    priorities: config?.priorities ?? [],
    repoWideChanges: config?.repoWideChanges ?? [
      "lage.config.js",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "lerna.json",
      "rush.json",
    ],
    loggerOptions: config?.loggerOptions ?? {},
    runners: config?.runners ?? {},
    workerIdleMemoryLimit: config?.workerIdleMemoryLimit ?? os.totalmem(), // 0 means no limit,
    concurrency: config?.concurrency ?? availableParallelism,
    allowNoTargetRuns: config?.allowNoTargetRuns ?? false,
  };
}
