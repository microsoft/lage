import { clearCache } from "./clearCache.js";
import type { Command } from "commander";
import { getConfig } from "@lage-run/config";
import { pruneCache } from "./pruneCache.js";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";

interface CacheOptions extends ReporterInitOptions {
  prune?: number;
  clear?: boolean;
}

export async function cacheAction(options: CacheOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();

  if (options.clear) {
    return await clearCache({
      cwd: process.cwd(),
      internalCacheFolder: config.cacheOptions.internalCacheFolder,
      logger,
      concurrency: options.concurrency,
    });
  } else if (options.prune) {
    return await pruneCache({
      pruneDays: options.prune,
      cwd: process.cwd(),
      internalCacheFolder: config.cacheOptions.internalCacheFolder,
      logger,
      concurrency: options.concurrency,
    });
  }

  command.help();
}
