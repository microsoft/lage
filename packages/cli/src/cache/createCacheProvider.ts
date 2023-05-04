import type { CacheOptions } from "@lage-run/cache";
import { TargetHasher } from "@lage-run/hasher";
import type { Logger } from "@lage-run/logger";

interface CreateCacheOptions {
  cacheOptions?: CacheOptions;
  logger: Logger;
  root: string;
  skipLocalCache: boolean;
  cliArgs: string[];
}

export async function createCache(options: CreateCacheOptions) {
  const { cacheOptions, root, cliArgs } = options;

  const hasher = new TargetHasher({
    root,
    environmentGlob: cacheOptions?.environmentGlob ?? [],
    cacheKey: cacheOptions?.cacheKey,
    cliArgs,
  });

  await hasher.initialize();

  return { hasher };
}
