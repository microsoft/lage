import type { Config as BackfillCacheOptions } from "backfill-config";

export type CacheOptions = BackfillCacheOptions & {
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
   * Repo-root-relative globs for files whose current contents contribute to package-target cache keys
   * (in addition to package-specific inputs). A target's `environmentGlob` overrides these patterns.
   *
   * Within lage, this does not affect selection of packages to run. If any of these globs should also
   * invalidate the `--since` flag, they should be listed in the lage config's `repoWideChanges` as well.
   */
  environmentGlob?: string[];

  /**
   * The cache key is a custom string that will be concatenated with the package file contents and the environment glob contents
   * to generate the cache key.
   */
  cacheKey?: string;
};
