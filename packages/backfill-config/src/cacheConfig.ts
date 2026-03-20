import type { Logger } from "backfill-logger";
import type { NpmCacheStorageConfig } from "./npmCacheConfig.js";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<boolean>;
  put: (hash: string, filesToCache: string[]) => Promise<void>;
}

/**
 * A plugin that provides a custom cache storage implementation.
 * The plugin module should export this as its default export.
 */
export interface CustomCacheStoragePlugin<TOptions = unknown> {
  name: string;
  getProvider: (
    logger: Logger,
    cwd: string,
    options: TOptions
  ) => ICacheStorage;
}

/**
 * Configuration for a custom (plugin-based) cache storage provider.
 * The `plugin` field should be a package name or path that exports a
 * `CustomCacheStoragePlugin` as its default export.
 */
export type CustomCacheStorageConfig<TOptions = unknown> = {
  provider: "custom";
  /**
   * Package name or path to the plugin module.
   * If a package name, it's resolved from node_modules.
   */
  plugin: string;
  options: TOptions;
};

export type CacheStorageConfig =
  | {
      provider: "local";
    }
  | {
      provider: "local-skip";
    }
  | NpmCacheStorageConfig
  | CustomCacheStorageConfig;

/**
 * Environment variable names for the cache storage config.
 */
export const cacheConfigEnvNames = {
  cacheProvider: "BACKFILL_CACHE_PROVIDER",
  cacheProviderOptions: "BACKFILL_CACHE_PROVIDER_OPTIONS",
};
