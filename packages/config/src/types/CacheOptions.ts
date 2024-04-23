import type { Config as BackfillCacheOptions, CustomStorageConfig } from "backfill-config";

export type LageBackfillCacheOptions = Omit<BackfillCacheOptions, "cacheStorageConfig"> & {
  cacheStorageConfig: Exclude<BackfillCacheOptions["cacheStorageConfig"], CustomStorageConfig>;
};

export type CacheOptions = LageBackfillCacheOptions & {
  environmentGlob: string[];
  cacheKey: string;
  writeRemoteCache: boolean;
  skipLocalCache: boolean;
};
