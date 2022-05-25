import { getCacheConfig } from "./cacheConfig";
import { logger } from "../logger";
import { salt } from "./salt";
import * as backfill from "backfill/lib/api";
import { CacheOptions } from "../types/CacheOptions";

export async function cacheHash(
  id: string,
  cwd: string,
  root: string,
  cacheOptions: CacheOptions,
  args: any
) {
  const cacheConfig = getCacheConfig(cwd, cacheOptions);

  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );

  const hashKey = salt(
    cacheOptions.environmentGlob || ["lage.config.js"],
    `${id}|${JSON.stringify(args)}`,
    root,
    cacheOptions.cacheKey
  );

  backfillLogger.setName(id);

  try {
    return await backfill.computeHash(
      cwd,
      backfillLogger,
      hashKey,
      cacheConfig
    );
  } catch {
    // computeHash can throw exception when git is not installed or the repo hashes cannot be calculated with a staged file that is deleted
    // lage will continue as if this package cannot be cached
  }

  return null;
}

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
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );

  try {
    return await backfill.fetch(cwd, hash, backfillLogger, cacheConfig);
  } catch (e) {
    logger.error(`${id} fetchBackfill ${e && (e as any).stack || e && (e as any).message || e}`);
  }

  return false;
}

export async function cachePut(
  hash: string | null,
  cwd: string,
  cacheOptions: CacheOptions
) {
  if (!hash) {
    return;
  }

  const cacheConfig = getCacheConfig(cwd, cacheOptions);
  const backfillLogger = backfill.makeLogger(
    "warn",
    process.stdout,
    process.stderr
  );

  try {
    await backfill.put(cwd, hash, backfillLogger, cacheConfig);
  } catch (e) {
    // sometimes outputGlob don't match any files, so skipping this
  }
}
