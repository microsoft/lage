import { makeLogger, computeHash } from "backfill/lib/api";

import { getCacheConfig } from "./cacheConfig";
import { CacheOptions } from "./CacheOptions";
import { salt } from "./salt";

export async function cacheHash(id: string, cwd: string, root: string, cacheOptions: CacheOptions, args: any) {
  const cacheConfig = getCacheConfig(cwd, cacheOptions);
  const backfillLogger = makeLogger("error", process.stdout, process.stderr);

  const hashKey = salt(cacheOptions.environmentGlob || ["lage.config.js"], `${id}|${JSON.stringify(args)}`, root, cacheOptions.cacheKey);

  backfillLogger.setName(id);

  try {
    return await computeHash(cwd, backfillLogger, hashKey, cacheConfig);
  } catch {
    // computeHash can throw exception when git is not installed or the repo hashes cannot be calculated with a staged file that is deleted
    // lage will continue as if this package cannot be cached
  }

  return null;
}
