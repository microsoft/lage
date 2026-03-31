import type { CacheStorageConfig, CustomStorageConfig } from "backfill-config";
import type { Logger } from "backfill-logger";

import type { ICacheStorage } from "./CacheStorage.js";
import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage.js";
import { LocalCacheStorage } from "./LocalCacheStorage.js";
import { NpmCacheStorage } from "./NpmCacheStorage.js";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage.js";

export function isCustomProvider(
  config: CacheStorageConfig
): config is CustomStorageConfig {
  return typeof config.provider === "function";
}

const memo = new Map<string, ICacheStorage>();

/**
 * Get the cache storage provider with the given options.
 * @param cacheStorageConfig Cache storage config (usually from backfill/lage config file + env)
 * @param internalCacheFolder Relative path to the cache folder, such as `node_modules/.cache/backfill`
 */
export function getCacheStorageProvider(
  cacheStorageConfig: CacheStorageConfig,
  internalCacheFolder: string,
  logger: Logger,
  cwd: string,
  incrementalCaching = false
): ICacheStorage {
  let cacheStorage: ICacheStorage | undefined;

  if (isCustomProvider(cacheStorageConfig)) {
    try {
      return cacheStorageConfig.provider(logger, cwd);
    } catch {
      throw new Error("cacheStorageConfig.provider cannot be creaated");
    }
  }

  const key = `${cacheStorageConfig.provider}${internalCacheFolder}${cwd}`;
  cacheStorage = memo.get(key);
  if (cacheStorage) {
    return cacheStorage;
  }

  if (cacheStorageConfig.provider === "npm") {
    cacheStorage = new NpmCacheStorage(
      cacheStorageConfig.options,
      internalCacheFolder,
      logger,
      cwd,
      incrementalCaching
    );
  } else if (cacheStorageConfig.provider === "azure-blob") {
    cacheStorage = new AzureBlobCacheStorage(
      cacheStorageConfig.options,
      logger,
      cwd,
      incrementalCaching
    );
  } else if (cacheStorageConfig.provider === "local-skip") {
    cacheStorage = new LocalSkipCacheStorage(
      internalCacheFolder,
      logger,
      cwd,
      incrementalCaching
    );
  } else {
    cacheStorage = new LocalCacheStorage(
      internalCacheFolder,
      logger,
      cwd,
      incrementalCaching
    );
  }
  memo.set(key, cacheStorage);

  return cacheStorage;
}
