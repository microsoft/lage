import type { Logger } from "@lage-run/logger";
import { getWorkspaceManagerRoot } from "workspace-tools";
import { getConfig, getConcurrency } from "@lage-run/config";
import { BackfillCacheProvider } from "@lage-run/cache";

export interface PruneCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
  pruneDays: number;
}

export async function pruneCache(options: PruneCacheOptions): Promise<void> {
  const { logger, cwd, pruneDays } = options;

  const config = await getConfig(cwd);
  const workspaceRoot = getWorkspaceManagerRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const prunePeriod = pruneDays || 30;

  const cacheProvider = new BackfillCacheProvider({
    root: workspaceRoot,
    cacheOptions: config.cacheOptions,
    logger,
  });

  // eslint-disable-next-line no-console
  console.log("Clearing Cache");

  await cacheProvider.purge(prunePeriod, concurrency);

  // eslint-disable-next-line no-console
  console.log("Cache Cleared");
}
