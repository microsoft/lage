import type { Target } from "@lage-run/target-graph";
import type { Config as BackfillCacheOptions } from "backfill-config";

export type CacheProviderOptions = BackfillCacheOptions;

export interface CacheProvider {
  hash(target: Target, args?: unknown): Promise<string>;
  fetch(hash: string, target: Target): Promise<boolean>;
  put(hash: string, target: Target): Promise<void>;
  clear(): Promise<void>;
  purge(sinceDays: number): Promise<void>;
}
