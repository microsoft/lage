import { ICacheStorage } from "backfill-config";
import { getCacheStorageProvider, isCustomProvider } from "backfill-cache";
import { Logger } from "backfill-logger";
import { CacheOptions } from "../types/CacheOptions";

export type RemoteFallbackCacheProviderOptions = Pick<
  CacheOptions,
  "internalCacheFolder" | "cacheStorageConfig" | "writeRemoteCache"
>;

export class RemoteFallbackCacheProvider implements ICacheStorage {
  private localCacheStorageProvider: ICacheStorage;
  private remoteCacheStorageProvider?: ICacheStorage;

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
