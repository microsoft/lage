import { getConfig, getConcurrency } from "@lage-run/config";
import { getWorkspaceManagerRoot } from "workspace-tools";
import type { Logger } from "@lage-run/logger";
import { BackfillCacheProvider } from "@lage-run/cache";

export interface ClearCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
}

export async function clearCache(options: ClearCacheOptions): Promise<void> {
  const { logger, cwd } = options;

  const config = await getConfig(cwd);

  const workspaceRoot = getWorkspaceManagerRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const cacheProvider = new BackfillCacheProvider({
    root: workspaceRoot,
    cacheOptions: config.cacheOptions,
    logger,
  });

  // eslint-disable-next-line no-console
  console.log("Clearing Cache");

  await cacheProvider.clear(concurrency);

  // eslint-disable-next-line no-console
  console.log("Cache Cleared");
}
