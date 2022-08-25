import { clearCache } from "./clearCache";
import { Command } from "commander";
import { getConfig } from "../../config/getConfig";
import { initializeReporters } from "../../reporters/initialize";
import { pruneCache } from "./pruneCache";
import createLogger from "@lage-run/logger";
import { ReporterInitOptions } from "../../types/LoggerOptions";

interface CacheOptions extends ReporterInitOptions {
  prune?: number;
  clear?: boolean;
}

export async function cacheAction(options: CacheOptions, command: Command) {
  const cwd = process.cwd();
  const config = getConfig(cwd);
  const logger = createLogger();

  initializeReporters(logger, options);

  if (options.prune) {
    await pruneCache(options.prune, process.cwd(), config.cacheOptions.internalCacheFolder, logger);
  }

  if (options.clear) {
    await clearCache(process.cwd(), config.cacheOptions.internalCacheFolder, logger);
  }
}
