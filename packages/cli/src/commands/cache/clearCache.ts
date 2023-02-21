import { getConfig } from "../../config/getConfig.js";
import { getWorkspaceRoot } from "workspace-tools";
import type { Logger } from "@lage-run/logger";
import { getConcurrency } from "../../config/getConcurrency.js";
import { BackfillCacheProvider } from "@lage-run/cache";

export interface ClearCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
}

export async function clearCache(options: ClearCacheOptions) {
  const { logger, cwd } = options;

  const config = await getConfig(cwd);

  const workspaceRoot = getWorkspaceRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const cacheProvider = new BackfillCacheProvider({
    root: cwd,
    cacheOptions: config.cacheOptions,
    logger,
  });

  // eslint-disable-next-line no-console
  console.log("Clearing Cache");

  cacheProvider.clear(concurrency);

  // eslint-disable-next-line no-console
  console.log("Cache Cleared");
}
