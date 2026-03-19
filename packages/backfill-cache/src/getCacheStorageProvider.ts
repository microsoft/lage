import type { CacheStorageConfig, CustomStorageConfig, CustomCacheStorageConfig, CustomCacheStoragePlugin } from "backfill-config";
import type { Logger } from "backfill-logger";

import type { ICacheStorage } from "./CacheStorage.js";
import { LocalCacheStorage } from "./LocalCacheStorage.js";
import { NpmCacheStorage } from "./NpmCacheStorage.js";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage.js";

export function isCustomProvider(
  config: CacheStorageConfig
): config is CustomStorageConfig {
  return typeof config.provider === "function";
}

export function isCustomPluginProvider(
  config: CacheStorageConfig
): config is CustomCacheStorageConfig {
  return typeof config.provider === "string" && config.provider === "custom";
}

const memo = new Map<string, ICacheStorage>();

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

  if (isCustomPluginProvider(cacheStorageConfig)) {
    const key = `custom:${cacheStorageConfig.plugin}${internalCacheFolder}${cwd}`;
    cacheStorage = memo.get(key);
    if (cacheStorage) {
      return cacheStorage;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pluginModule = require(cacheStorageConfig.plugin);
      const plugin: CustomCacheStoragePlugin = pluginModule.default || pluginModule;
      cacheStorage = plugin.getProvider(logger, cwd, cacheStorageConfig.options);
    } catch (err) {
      throw new Error(
        `Failed to load custom cache storage plugin "${cacheStorageConfig.plugin}": ${err}`
      );
    }

    memo.set(key, cacheStorage);
    return cacheStorage;
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
