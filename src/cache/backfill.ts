import { Config } from "../types/Config";
import { getCacheConfig } from "./cacheConfig";
import { logger } from "../logger";
import { PackageInfo } from "workspace-tools";
import * as backfill from "backfill/lib/api";
import path from "path";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function cacheHash(info: PackageInfo, config: Config) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );
  const name = info.name;
  backfillLogger.setName(name);
  try {
    const hash = await backfill.computeHash(
      packagePath,
      backfillLogger,
      config.command.join(" ") + config.args.join(" "),
      cacheConfig
    );
    hashes[info.name] = hash;
  } catch (e) {
    logger.error(`${info.name} computeHash`, e);
  }
}

export async function cacheFetch(info: PackageInfo, config: Config) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
  const backfillLogger = backfill.makeLogger(
    "error",
    process.stdout,
    process.stderr
  );
  const hash = hashes[info.name];
  try {
    const cacheHit = await backfill.fetch(
      packagePath,
      hash,
      backfillLogger,
      cacheConfig
    );
    cacheHits[info.name] = cacheHit;
  } catch (e) {
    logger.error(`${info.name} fetchBackfill`, e);
  }
}

export async function cachePut(info: PackageInfo, config: Config) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, config);
  const backfillLogger = backfill.makeLogger(
    "warn",
    process.stdout,
    process.stderr
  );
  const hash = hashes[info.name];
  try {
    await backfill.put(packagePath, hash, backfillLogger, cacheConfig);
  } catch (e) {
    // sometimes outputGlob don't match any files, so skipping this
  }
}

export { cacheHits };
