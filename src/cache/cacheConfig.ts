import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { Config } from "../types/Config";

export function getCacheConfig(cwd: string, config: Config) {
  const defaultCacheConfig = createDefaultConfig(cwd);

  // in lage, default mode is to CACHE locally
  defaultCacheConfig.cacheStorageConfig.provider = "local";

  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);
  return {
    ...defaultCacheConfig,
    ...config.cacheOptions,
    ...envConfig,
  };
}
