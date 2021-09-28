import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";

export function getCacheConfig(cwd: string, cacheOptions: CacheOptions): CacheOptions {
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

export function getLocalFallbackCacheConfig(cwd: string, cacheOptions: CacheOptions): CacheOptions {
  const defaultCacheConfig = createDefaultConfig(cwd);
  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);
  return {
    ...defaultCacheConfig,
    ...cacheOptions,
    ...envConfig,
    cacheStorageConfig: {
      provider: "local",
    },
  };
}

export function isRemoteCache(cwd: string, cacheOptions: CacheOptions) {
  const configWithEnv = getCacheConfig(cwd, cacheOptions);
  return !configWithEnv?.cacheStorageConfig?.provider?.includes("local");
}
