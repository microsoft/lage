import * as path from "path";
import { createRequire } from "module";
import type {
  CacheStorageConfig,
  CustomCacheStorageConfig,
  CustomCacheStoragePlugin,
} from "backfill-config";
import type { Logger } from "backfill-logger";

import type { ICacheStorage } from "./CacheStorage.js";
import { LocalCacheStorage } from "./LocalCacheStorage.js";
import { NpmCacheStorage } from "./NpmCacheStorage.js";
import { LocalSkipCacheStorage } from "./LocalSkipCacheStorage.js";

export function isCustomPluginProvider(
  config: CacheStorageConfig
): config is CustomCacheStorageConfig {
  return typeof config.provider === "string" && config.provider === "custom";
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

  if (isCustomPluginProvider(cacheStorageConfig)) {
    const key = `custom:${cacheStorageConfig.plugin}${internalCacheFolder}${cwd}`;
    cacheStorage = memo.get(key);
    if (cacheStorage) {
      return cacheStorage;
    }

    try {
      const pluginName = cacheStorageConfig.plugin;
      let resolvedPlugin: string;

      if (path.isAbsolute(pluginName)) {
        resolvedPlugin = pluginName;
      } else {
        // Resolve relative paths and package names from cwd
        const cwdRequire = createRequire(path.resolve(cwd, "package.json"));
        resolvedPlugin = cwdRequire.resolve(pluginName);
      }

      const pluginModule = createRequire(__filename)(resolvedPlugin);
      const plugin: CustomCacheStoragePlugin =
        pluginModule.default || pluginModule;
      cacheStorage = plugin.getProvider(
        logger,
        cwd,
        cacheStorageConfig.options
      );
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
