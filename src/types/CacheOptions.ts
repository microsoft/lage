import { Config as BackfillCacheOptions } from "backfill-config";

export type CacheOptions = BackfillCacheOptions & {
  /** @deprecated please use the environmentGlob at the root level as it is now shared with lage itself */
  environmentGlob: string[];
};
