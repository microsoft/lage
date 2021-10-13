import { ICacheStorage } from "backfill-config";
import { getCacheStorageProvider, isCustomProvider } from "backfill-cache";
import { Logger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";
import { logger } from "../logger";

export type RemoteFallbackCacheProviderOptions = Pick<
  CacheOptions,
  "internalCacheFolder" | "cacheStorageConfig" | "writeRemoteCache"
>;

export class RemoteFallbackCacheProvider implements ICacheStorage {
  private localCacheStorageProvider: ICacheStorage;
  private remoteCacheStorageProvider?: ICacheStorage;

  private static localHits: { [hash: string]: boolean } = {};
  private static remoteHits: { [hash: string]: boolean } = {};

  constructor(private cacheOptions: RemoteFallbackCacheProviderOptions, logger: Logger, cwd: string) {
    this.localCacheStorageProvider = getCacheStorageProvider(
      {
        provider: "local",
      },
      cacheOptions.internalCacheFolder,
      logger,
      cwd
    );

    // Remote providers should have a provider name of something other than "local" OR it is
    // a custom provider (currently S3 would be a custom provider)
    const isRemoteProvider =
      isCustomProvider(cacheOptions.cacheStorageConfig) ||
      (typeof cacheOptions.cacheStorageConfig.provider === "string" &&
        !cacheOptions.cacheStorageConfig.provider.includes("local"));

    if (isRemoteProvider) {
      logger.silly("remote provider enabled");

      this.remoteCacheStorageProvider = getCacheStorageProvider(
        cacheOptions.cacheStorageConfig,
        cacheOptions.internalCacheFolder,
        logger,
        cwd
      );
    }
  }

  async fetch(hash: string) {
    RemoteFallbackCacheProvider.localHits[hash] = await this.localCacheStorageProvider.fetch(hash);
    logger.silly(`local cache fetch: ${hash} ${RemoteFallbackCacheProvider.localHits[hash]}`);

    if (!RemoteFallbackCacheProvider.localHits[hash] && this.remoteCacheStorageProvider) {
      RemoteFallbackCacheProvider.remoteHits[hash] = await this.remoteCacheStorageProvider.fetch(hash);
      logger.silly(`remote fallback fetch: ${hash} ${RemoteFallbackCacheProvider.remoteHits[hash]}`);
      return RemoteFallbackCacheProvider.remoteHits[hash];
    }

    return RemoteFallbackCacheProvider.localHits[hash];
  }

  async put(hash: string, filesToCache: string[]) {
    const putPromises: Promise<void>[] = [];

    // Write local cache if it doesn't already exist, or if the the hash isn't in the localHits
    const shouldWriteLocalCache = !this.isLocalHit(hash);

    if (shouldWriteLocalCache) {
      logger.silly(`local cache put: ${hash}`);
      putPromises.push(this.localCacheStorageProvider.put(hash, filesToCache));
    }

    // Write to remote if there is a no hit in the remote cache, and remote cache storage provider, and that the "writeRemoteCache" config flag is set to true
    const shouldWriteRemoteCache =
      !this.isRemoteHit(hash) && !!this.remoteCacheStorageProvider && this.cacheOptions.writeRemoteCache;

    if (shouldWriteRemoteCache) {
      logger.silly(`remote fallback put: ${hash}`);
      const remotePut = this.remoteCacheStorageProvider!.put(hash, filesToCache);
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
}
