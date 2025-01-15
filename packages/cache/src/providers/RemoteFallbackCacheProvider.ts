import type { CacheProvider } from "../types/CacheProvider.js";
import type { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";

export interface RemoteFallbackCacheProviderOptions {
  root: string;
  logger: Logger;

  localCacheProvider?: CacheProvider;
  remoteCacheProvider?: CacheProvider;

  writeRemoteCache?: boolean;
}

/**
 * Remote Fallback Cache Provider
 *
 * This backfill cache provider will fallback to a remote cache provider if the local cache does not contain the item.
 * It will also automatically populate the local cache with the remote cache.
 */
export class RemoteFallbackCacheProvider implements CacheProvider {
  private static localHits: { [hash: string]: boolean } = {};
  private static remoteHits: { [hash: string]: boolean } = {};

  constructor(private options: RemoteFallbackCacheProviderOptions) {}

  async fetch(hash: string, target: Target): Promise<boolean> {
    const { logger, remoteCacheProvider, localCacheProvider } = this.options;

    if (localCacheProvider) {
      RemoteFallbackCacheProvider.localHits[hash] = await localCacheProvider.fetch(hash, target);
      logger.silly(`local cache fetch: ${hash} ${RemoteFallbackCacheProvider.localHits[hash]}`);
    }

    if (!RemoteFallbackCacheProvider.localHits[hash] && remoteCacheProvider) {
      RemoteFallbackCacheProvider.remoteHits[hash] = await remoteCacheProvider.fetch(hash, target);
      logger.silly(`remote fallback fetch: ${hash} ${RemoteFallbackCacheProvider.remoteHits[hash]}`);

      // now save this into the localCacheProvider, if available
      if (localCacheProvider && RemoteFallbackCacheProvider.remoteHits[hash]) {
        logger.silly(`local cache put, fetched cache from remote: ${hash}`);
        await localCacheProvider.put(hash, target);
      }

      return RemoteFallbackCacheProvider.remoteHits[hash];
    }

    return RemoteFallbackCacheProvider.localHits[hash];
  }

  async put(hash: string, target: Target): Promise<void> {
    const { logger, remoteCacheProvider, localCacheProvider, writeRemoteCache } = this.options;
    const putPromises: Promise<void>[] = [];

    // Write local cache if it doesn't already exist, or if the the hash isn't in the localHits
    const shouldWriteLocalCache = !this.isLocalHit(hash) && !!localCacheProvider;

    if (shouldWriteLocalCache) {
      logger.silly(`local cache put: ${hash}`);
      putPromises.push(localCacheProvider.put(hash, target));
    }

    // Write to remote if there is a no hit in the remote cache, and remote cache storage provider, and that the "writeRemoteCache" config flag is set to true
    const shouldWriteRemoteCache = !this.isRemoteHit(hash) && !!remoteCacheProvider && writeRemoteCache;

    if (shouldWriteRemoteCache) {
      logger.silly(`remote fallback put: ${hash}`);
      const remotePut = remoteCacheProvider.put(hash, target);
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
    const { localCacheProvider } = this.options;
    if (localCacheProvider) {
      return localCacheProvider.clear();
    }
  }

  async purge(sinceDays: number): Promise<void> {
    const { localCacheProvider } = this.options;
    if (localCacheProvider) {
      return localCacheProvider.purge(sinceDays);
    }
  }
}
