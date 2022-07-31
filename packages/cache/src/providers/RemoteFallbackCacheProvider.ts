import { BackfillCacheProvider } from "./BackfillCacheProvider";
import { CacheOptions } from "../types/CacheOptions";
import { CacheProvider } from "../types/CacheProvider";
import { isCustomProvider } from "backfill-cache";
import { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";

/**
 * Remote Fallback Cache Provider
 *
 * This backfill cache provider will fallback to a remote cache provider if the local cache does not contain the item.
 * It will also automatically populate the local cache with the remote cache.
 */
export class RemoteFallbackCacheProvider implements CacheProvider {
  private localCacheStorageProvider: CacheProvider;
  private remoteCacheStorageProvider?: CacheProvider;

  private static localHits: { [hash: string]: boolean } = {};
  private static remoteHits: { [hash: string]: boolean } = {};

  constructor(root: string, private cacheOptions: CacheOptions, private logger: Logger) {
    const localCacheOptions: CacheOptions = {
      ...cacheOptions,
      cacheStorageConfig: {
        provider: "local",
      },
    };

    this.localCacheStorageProvider = new BackfillCacheProvider(root, localCacheOptions);

    // Remote providers should have a provider name of something other than "local" OR it is
    // a custom provider (currently S3 would be a custom provider)
    const isRemoteProvider =
      isCustomProvider(cacheOptions.cacheStorageConfig) ||
      (typeof cacheOptions.cacheStorageConfig.provider === "string" && !cacheOptions.cacheStorageConfig.provider.includes("local"));

    if (isRemoteProvider) {
      this.logger.silly("remote provider enabled");
      this.remoteCacheStorageProvider = new BackfillCacheProvider(root, cacheOptions);
    }
  }

  hash(target: Target, args: any): Promise<string> {
    return this.localCacheStorageProvider.hash(target, args);
  }

  async fetch(hash: string, target: Target) {
    if (!this.cacheOptions.skipLocalCache) {
      RemoteFallbackCacheProvider.localHits[hash] = await this.localCacheStorageProvider.fetch(hash, target);
      this.logger.silly(`local cache fetch: ${hash} ${RemoteFallbackCacheProvider.localHits[hash]}`);
    }

    if (!RemoteFallbackCacheProvider.localHits[hash] && this.remoteCacheStorageProvider) {
      RemoteFallbackCacheProvider.remoteHits[hash] = await this.remoteCacheStorageProvider.fetch(hash, target);
      this.logger.silly(`remote fallback fetch: ${hash} ${RemoteFallbackCacheProvider.remoteHits[hash]}`);
      return RemoteFallbackCacheProvider.remoteHits[hash];
    }

    return RemoteFallbackCacheProvider.localHits[hash];
  }

  async put(hash: string, target: Target) {
    const putPromises: Promise<void>[] = [];

    // Write local cache if it doesn't already exist, or if the the hash isn't in the localHits
    const shouldWriteLocalCache = !this.isLocalHit(hash) && !this.cacheOptions.skipLocalCache;

    if (shouldWriteLocalCache) {
      this.logger.silly(`local cache put: ${hash}`);
      putPromises.push(this.localCacheStorageProvider.put(hash, target));
    }

    // Write to remote if there is a no hit in the remote cache, and remote cache storage provider, and that the "writeRemoteCache" config flag is set to true
    const shouldWriteRemoteCache = !this.isRemoteHit(hash) && !!this.remoteCacheStorageProvider && this.cacheOptions.writeRemoteCache;

    if (shouldWriteRemoteCache) {
      this.logger.silly(`remote fallback put: ${hash}`);
      const remotePut = this.remoteCacheStorageProvider!.put(hash, target);
      putPromises.push(remotePut);
    }

    await Promise.all(putPromises);
  }

  private isRemoteHit(hash) {
    return hash in RemoteFallbackCacheProvider.remoteHits && RemoteFallbackCacheProvider.remoteHits[hash];
  }

  private isLocalHit(hash) {
    return hash in RemoteFallbackCacheProvider.localHits && RemoteFallbackCacheProvider.localHits[hash];
  }

  async clear(): Promise<void> {
    return this.localCacheStorageProvider.clear();
  }

  async purge(sinceDays: number): Promise<void> {
    return this.localCacheStorageProvider.purge(sinceDays);
  }
}
