import type { CacheProviderOptions } from "./CacheProvider";

export interface CacheOptions extends CacheProviderOptions {
  writeRemoteCache?: boolean;
  skipLocalCache: boolean;

  environmentGlob: string[];
  cacheKey: string;
}
