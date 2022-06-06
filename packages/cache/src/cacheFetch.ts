import { getCacheConfig } from "./cacheConfig";
import createLogger from "@lage-run/logger";
import { makeLogger, fetch } from "backfill/lib/api";
import type { CacheOptions } from "./CacheOptions";

export async function cacheFetch(
  hash: string | null,
  id: string,
  cwd: string,
  cacheOptions: CacheOptions
) {
  if (!hash) {
    return false;
  }

  const cacheConfig = getCacheConfig(cwd, cacheOptions);
  const backfillLogger = makeLogger("error", process.stdout, process.stderr);

  try {
    return await fetch(cwd, hash, backfillLogger, cacheConfig);
  } catch (e) {
    const logger = createLogger();
    logger.error(
      `${id} fetchBackfill ${
        (e && (e as any).stack) || (e && (e as any).message) || e
      }`
    );
  }

  return false;
}
