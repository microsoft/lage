import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";

export function getCacheConfig(cwd: string, cacheOptions: CacheOptions) {
  const defaultCacheConfig = createDefaultConfig(cwd);

  // in lage, default mode is to CACHE locally
  defaultCacheConfig.cacheStorageConfig.provider = "local";

  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);
  return {
    ...defaultCacheConfig,
    ...cacheOptions,
    ...envConfig,
  };
}
