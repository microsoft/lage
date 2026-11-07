import { getConcurrency, getConfig } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import type { Command } from "commander";
import type { CacheCommandOptions } from "./index.js";
import { getWorkspaceManagerRoot } from "workspace-tools";
import { BackfillCacheProvider } from "@lage-run/cache";

export async function cacheAction(options: CacheCommandOptions, command: Command): Promise<void> {
  if (!options.clear && !options.prune) {
    command.help();
  }

  const cwd = process.cwd();
  const root = getWorkspaceManagerRoot(cwd);
  if (!root) {
    return;
  }

  const config = await getConfig(cwd);
  const logger = createLogger();
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  const cacheProvider = new BackfillCacheProvider({ root, cacheOptions: config.cacheOptions, logger });

  // eslint-disable-next-line no-console
  console.log("Clearing Cache");

  if (options.prune) {
    await cacheProvider.purge(options.prune, concurrency);
  } else {
    await cacheProvider.clear(options.concurrency);
  }

  // eslint-disable-next-line no-console
  console.log("Cache Cleared");
}
