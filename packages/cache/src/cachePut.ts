import { getCacheConfig } from "./cacheConfig";
import { makeLogger, put } from "backfill/lib/api";
import type { CacheOptions } from "./CacheOptions";

export async function cachePut(hash: string | null, cwd: string, cacheOptions: CacheOptions) {
  if (!hash) {
    return;
  }

  const cacheConfig = getCacheConfig(cwd, cacheOptions);
  const backfillLogger = makeLogger("warn", process.stdout, process.stderr);

  try {
    await put(cwd, hash, backfillLogger, cacheConfig);
  } catch (e) {
    // sometimes outputGlob don't match any files, so skipping this
  }
}
