import { getCacheConfig } from "./cacheConfig";
import { logger } from "../logger";
import { salt } from "./salt";
import * as backfill from "backfill/lib/api";
import { CacheOptions } from "../types/CacheOptions";

export async function cacheHash(
  task: string,
  name: string,
  root: string,
  packagePath: string,
  cacheOptions: CacheOptions,
  args: any
) {
  const cacheConfig = getCacheConfig(packagePath, cacheOptions);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );
  const hashKey = salt(
    cacheOptions.environmentGlob || ["lage.config.js"],
    `${name}|${task}|${JSON.stringify(args)}`,
    root,
    cacheOptions.cacheKey
  );

  backfillLogger.setName(name);
  try {
    return await backfill.computeHash(
      packagePath,
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
  task: string,
  name: string,
  packagePath: string,
  cacheOptions: CacheOptions
) {
  if (!hash) {
    return false;
  }

  const cacheConfig = getCacheConfig(packagePath, cacheOptions);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );

  try {
    return await backfill.fetch(packagePath, hash, backfillLogger, cacheConfig);
  } catch (e) {
    logger.error(`${name} fetchBackfill`, e);
  }

  return false;
}

export async function cachePut(
  hash: string | null,
  packagePath: string,
  cacheOptions: CacheOptions
) {
  if (!hash) {
    return;
  }

  const cacheConfig = getCacheConfig(packagePath, cacheOptions);
  const backfillLogger = backfill.makeLogger(
    "warn",
    process.stdout,
    process.stderr
  );

  try {
    await backfill.put(packagePath, hash, backfillLogger, cacheConfig);
  } catch (e) {
    // sometimes outputGlob don't match any files, so skipping this
  }
}
