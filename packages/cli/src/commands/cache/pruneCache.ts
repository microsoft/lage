import type { Logger } from "@lage-run/logger";
import { getWorkspaceRoot } from "workspace-tools";
import { getConfig } from "../../config/getConfig.js";
import { getConcurrency } from "../../config/getConcurrency.js";
import { BackfillCacheProvider } from "@lage-run/cache";

export interface PruneCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
  pruneDays: number;
}

export async function pruneCache(options: PruneCacheOptions) {
  const { logger, cwd, pruneDays } = options;

  const config = await getConfig(cwd);
  const workspaceRoot = getWorkspaceRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const prunePeriod = pruneDays || 30;

  const cacheProvider = new BackfillCacheProvider({
    root: cwd,
    cacheOptions: config.cacheOptions,
    logger,
  });

  // eslint-disable-next-line no-console
  console.log("Clearing Cache");

  cacheProvider.purge(prunePeriod, concurrency);

  // eslint-disable-next-line no-console
  console.log("Cache Cleared");
}
