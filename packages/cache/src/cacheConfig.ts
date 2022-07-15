import type { CacheOptions } from "./CacheOptions";
import type { Logger } from "backfill-logger";

import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";

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
    writeRemoteCache: cacheOptions.writeRemoteCache || !!process.env.LAGE_WRITE_REMOTE_CACHE,
  };

  const configWithFallback: CacheOptions = {
    ...configWithEnvOverrides,
    cacheStorageConfig: {
      ...configWithEnvOverrides.cacheStorageConfig,
      provider: (logger: Logger, cwd: string) => new RemoteFallbackCacheProvider(configWithEnvOverrides, logger, cwd),
      name: "remote-fallback-provider",
    },
  };

  return configWithFallback;
}
