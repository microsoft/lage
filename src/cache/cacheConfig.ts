import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { Logger, makeLogger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";
import { RemoteFallbackCacheProvider } from "./RemoteFallbackCacheProvider";

export function getCacheConfig(cwd: string, cacheOptions: CacheOptions) {
  const defaultCacheConfig = createDefaultConfig(cwd);

  // in lage, default mode is to CACHE locally
  defaultCacheConfig.cacheStorageConfig.provider = "local";

  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);

  const configWithEnvOverrides: CacheOptions = {
    ...defaultCacheConfig,
    ...cacheOptions,
    ...envConfig,
    writeRemoteCache: cacheOptions.writeRemoteCache || !!process.env.LAGE_WRITE_REMOTE_CACHE
  };

  const configWithFallback: CacheOptions = {
    ...configWithEnvOverrides,
    cacheStorageConfig: {
      ...configWithEnvOverrides.cacheStorageConfig,
      provider: (logger: Logger, cwd: string) => new RemoteFallbackCacheProvider(configWithEnvOverrides, logger, cwd),
    },
  };

  return configWithFallback;
}
