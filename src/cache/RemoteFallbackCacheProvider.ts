import { ICacheStorage } from "backfill-config";
import { getCacheStorageProvider, isCustomProvider } from "backfill-cache";
import { Logger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";

export class RemoteFallbackCacheProvider implements ICacheStorage {
  private localCacheStorageProvider: ICacheStorage;
  private remoteCacheStorageProvider?: ICacheStorage;

  constructor(private cacheOptions: CacheOptions, logger: Logger, cwd: string) {
    this.localCacheStorageProvider = getCacheStorageProvider(
      {
        provider: "local",
      },
      cacheOptions.internalCacheFolder,
      logger,
      cwd
    );

    if (
      isCustomProvider(cacheOptions.cacheStorageConfig) ||
      (typeof cacheOptions.cacheStorageConfig.provider === "string" &&
        !cacheOptions.cacheStorageConfig.provider.includes("local"))
    ) {
      this.remoteCacheStorageProvider = getCacheStorageProvider(
        cacheOptions.cacheStorageConfig,
        cacheOptions.internalCacheFolder,
        logger,
        cwd
      );
    }
  }

  async fetch(hash: string) {
    const hit = await this.localCacheStorageProvider.fetch(hash);

    if (!hit && this.remoteCacheStorageProvider) {
      return await this.remoteCacheStorageProvider.fetch(hash);
    }

    return hit;
  }

  async put(hash: string, filesToCache: string[]) {
    const localPut = this.localCacheStorageProvider.put(hash, filesToCache);
    const shouldWriteRemoteCache = this.remoteCacheStorageProvider && this.cacheOptions.writeRemoteCache;

    if (shouldWriteRemoteCache) {
      const remotePut = this.remoteCacheStorageProvider!.put(hash, filesToCache);
      await Promise.all([localPut, remotePut]);
    } else {
      await localPut;
    }
  }
}
