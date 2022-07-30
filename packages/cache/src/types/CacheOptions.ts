import type { Config as BackfillCacheOptions } from "backfill-config";

export interface CacheOptions extends BackfillCacheOptions {
  writeRemoteCache?: boolean;
  environmentGlob: string[];
  cacheKey: string;
  skipLocalCache: boolean;
}