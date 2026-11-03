import type { CacheOptions } from "@lage-run/cache";
import { TargetHasher } from "@lage-run/hasher";
import type { TargetLogger } from "@lage-run/reporters";
import type { PackageInfos } from "workspace-tools";
import type { RunCliOptions } from "../commands/options.js";

interface CreateCacheOptions extends Pick<RunCliOptions, "skipLocalCache"> {
  cacheOptions?: CacheOptions;
  logger: TargetLogger;
  root: string;
  packageInfos: PackageInfos;
  cliArgs: string[];
}

export async function createCache(options: CreateCacheOptions): Promise<{
  hasher: TargetHasher;
}> {
  const { cacheOptions, root, packageInfos, cliArgs, logger } = options;

  const hasher = new TargetHasher({
    root,
    packageInfos,
    environmentGlob: cacheOptions?.environmentGlob ?? [],
    cacheKey: cacheOptions?.cacheKey,
    cliArgs,
    logger,
  });

  await hasher.initialize();

  return { hasher };
}
