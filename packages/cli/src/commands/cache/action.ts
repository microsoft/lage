import { clearCache } from "./clearCache";
import { Command } from "commander";
import { getConfig } from "../../config/getConfig";
import { pruneCache } from "./pruneCache";
import createLogger from "@lage-run/logger";
import { initializeReporters } from "@lage-run/reporters";
import type { ReporterInitOptions } from "@lage-run/reporters";

interface CacheOptions extends ReporterInitOptions {
  prune?: number;
  clear?: boolean;
}

export async function cacheAction(options: CacheOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();

  initializeReporters(logger, options);

  if (options.clear) {
    return await clearCache(process.cwd(), config.cacheOptions.internalCacheFolder, logger);
  } else if (options.prune) {
    return await pruneCache(options.prune, process.cwd(), config.cacheOptions.internalCacheFolder, logger);
  }

  command.help();
}
