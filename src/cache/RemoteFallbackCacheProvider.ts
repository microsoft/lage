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

  constructor(
    private cacheOptions: RemoteFallbackCacheProviderOptions,
    logger: Logger,
    cwd: string
  ) {
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
    logger.silly(`local cache fetch: ${hash}`);
    const hit = await this.localCacheStorageProvider.fetch(hash);

    if (!hit && this.remoteCacheStorageProvider) {
      logger.silly(`remote fallback fetch: ${hash}`);
      return await this.remoteCacheStorageProvider.fetch(hash);
    }

    return hit;
  }

  async put(hash: string, filesToCache: string[]) {
    logger.silly(`local cache put: ${hash}`);
    const localPut = this.localCacheStorageProvider.put(hash, filesToCache);
    const shouldWriteRemoteCache =
      !!this.remoteCacheStorageProvider && this.cacheOptions.writeRemoteCache;
      
    if (shouldWriteRemoteCache) {
      logger.silly(`remote fallback put: ${hash}`);
      const remotePut = this.remoteCacheStorageProvider!.put(
        hash,
        filesToCache
      );
      await Promise.all([localPut, remotePut]);
    } else {
      await localPut;
    }
  }
}
