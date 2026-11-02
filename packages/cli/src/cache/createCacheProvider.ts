import type { CacheOptions } from "@lage-run/cache";
import { TargetHasher } from "@lage-run/hasher";
import type { TargetLogger } from "@lage-run/reporters";
import type { PackageInfos } from "workspace-tools";
import type { RunCliOptions } from "../commands/options.js";

interface CreateCacheOptions extends Pick<RunCliOptions, "skipLocalCache"> {
  cacheOptions?: CacheOptions;
  logger: TargetLogger;
  root: string;
  cliArgs: string[];
  packageInfos?: PackageInfos;
}

export async function createCache(options: CreateCacheOptions): Promise<{
  hasher: TargetHasher;
}> {
  const { cacheOptions, root, cliArgs, logger } = options;

  const hasher = new TargetHasher({
    root,
    environmentGlob: cacheOptions?.environmentGlob ?? [],
    cacheKey: cacheOptions?.cacheKey,
    cliArgs,
    logger,
    packageInfos: options.packageInfos,
  });

  await hasher.initialize();

  return { hasher };
}
