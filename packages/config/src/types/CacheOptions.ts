import type { Config as BackfillCacheOptions, CustomStorageConfig } from "backfill-config";

export type CacheOptions = Omit<BackfillCacheOptions, "cacheStorageConfig"> & {
  /**
   * Use this to specify a remote cache provider such as `'azure-blob'`.
   * @see https://github.com/microsoft/backfill#configuration
   */
  cacheStorageConfig?: Exclude<BackfillCacheOptions["cacheStorageConfig"], CustomStorageConfig>;

  /**
   * Whether to write to the remote cache - useful for continuous integration systems to provide build-over-build cache.
   * It is recommended to turn this OFF for local development, turning remote cache to be a build acceleration through remote cache downloads.
   */
  writeRemoteCache?: boolean;

  /**
   * Skips local cache entirely - useful for continous integration systems that only relies on a remote cache.
   */
  skipLocalCache?: boolean;

  /**
   * A list of globs to match files whose contents will determine the cache key in addition to the package file contents
   * The globs are relative to the root of the project.
   */
  environmentGlob?: string[];

  /**
   * The cache key is a custom string that will be concatenated with the package file contents and the environment glob contents
   * to generate the cache key.
   */
  cacheKey?: string;
};
