import { Config as BackfillCacheOptions } from "backfill-config";

export type CacheOptions = BackfillCacheOptions & {
  environmentGlob: string[];
  cacheKey: string;
  fallbackToLocal: boolean;
};
