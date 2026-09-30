import type { CacheOptions } from "@lage-run/cache";
import { TargetHasher } from "@lage-run/hasher";
import type { ExperimentalLockfileInvalidationOptions } from "@lage-run/lockfile";
import type { TargetLogger } from "@lage-run/reporters";

interface CreateCacheOptions {
  cacheOptions?: CacheOptions;
  logger: TargetLogger;
  root: string;
  skipLocalCache: boolean;
  cliArgs: string[];
  experimentalLockfileInvalidation?: ExperimentalLockfileInvalidationOptions;
}

export async function createCache(options: CreateCacheOptions): Promise<{
  hasher: TargetHasher;
}> {
  const { cacheOptions, root, cliArgs, logger, experimentalLockfileInvalidation } = options;

  const hasher = new TargetHasher({
    root,
    environmentGlob: cacheOptions?.environmentGlob ?? [],
    cacheKey: cacheOptions?.cacheKey,
    cliArgs,
    logger,
    experimentalLockfileInvalidation,
  });

  await hasher.initialize();

  return { hasher };
}
