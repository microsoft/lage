import type { CacheOptions } from "@lage-run/cache";
import { BackfillCacheProvider, LocalTarCacheProvider, RemoteFallbackCacheProvider } from "@lage-run/cache";
import { isRunningFromCI } from "@lage-run/config";
import type { Logger } from "@lage-run/logger";

interface CreateCacheOptions {
  cacheOptions?: CacheOptions;
  logger: Logger;
  root: string;
  skipLocalCache: boolean;
  cliArgs: string[];
}

export function createCache(options: CreateCacheOptions): {
  cacheProvider: RemoteFallbackCacheProvider;
} {
  const { cacheOptions, logger, root, skipLocalCache } = options;

  const hasRemoteCacheConfig =
    !!cacheOptions?.cacheStorageConfig || !!process.env.BACKFILL_CACHE_PROVIDER || !!process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;

  // Create Cache Provider
  const useLocalTarCache = cacheOptions?.useLocalTarCache === true;

  const localCacheProvider =
    skipLocalCache === true
      ? undefined
      : useLocalTarCache
        ? new LocalTarCacheProvider({
            logger,
            root,
            outputGlob: cacheOptions?.outputGlob,
          })
        : new BackfillCacheProvider({
            logger,
            root,
            cacheOptions: {
              outputGlob: cacheOptions?.outputGlob,
              ...(cacheOptions?.internalCacheFolder && { internalCacheFolder: cacheOptions.internalCacheFolder }),
              ...(cacheOptions?.incrementalCaching && { incrementalCaching: cacheOptions.incrementalCaching }),
            },
          });

  const cacheProvider = new RemoteFallbackCacheProvider({
    root,
    logger,
    localCacheProvider,
    remoteCacheProvider: hasRemoteCacheConfig ? new BackfillCacheProvider({ logger, root, cacheOptions: cacheOptions ?? {} }) : undefined,
    writeRemoteCache:
      (cacheOptions?.writeRemoteCache === true || String(process.env.LAGE_WRITE_CACHE).toLowerCase() === "true" || isRunningFromCI) &&
      String(process.env.LAGE_WRITE_CACHE).toLowerCase() !== "false",
  });

  return { cacheProvider };
}
