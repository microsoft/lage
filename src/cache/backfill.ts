import { Config } from "../types/Config";
import { getCacheConfig } from "./cacheConfig";
import { logger } from "../logger";
import { PackageInfo } from "workspace-tools";
import { salt } from "./salt";
import * as backfill from "backfill/lib/api";
import path from "path";

export async function cacheHash(
  task: string,
  info: PackageInfo,
  root: string,
  config: Config
) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );
  const name = info.name;
  const hashKey = salt(
    config.cacheOptions.environmentGlob || ["lage.config.js"],
    `${info.name}|${task}|${JSON.stringify(config.args)}`,
    root
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
  info: PackageInfo,
  config: Config
) {
  if (!hash) {
    return false;
  }

  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );

  try {
    return await backfill.fetch(packagePath, hash, backfillLogger, cacheConfig);
  } catch (e) {
    logger.error(`${info.name} fetchBackfill`, e);
  }

  return false;
}

export async function cachePut(
  hash: string | null,
  info: PackageInfo,
  config: Config
) {
  if (!hash) {
    return;
  }

  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
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
