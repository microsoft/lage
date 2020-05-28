import * as backfill from "backfill/lib/api";
import { PackageInfo } from "workspace-tools";
import path from "path";
import { RunContext } from "../types/RunContext";
import { getCacheConfig } from "./cacheConfig";
import log from "npmlog";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function computeHash(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);

  const logger = backfill.makeLogger("error", process.stdout, process.stderr);
  const name = info.name;

  logger.setName(name);

  try {
    const hash = await backfill.computeHash(
      packagePath,
      logger,
      context.command.join(" ") + context.args.join(" "),
      cacheConfig
    );

    hashes[info.name] = hash;
  } catch (e) {
    log.error(`${info.name} computeHash`, e);
  }
}

export async function fetchBackfill(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);
  const logger = backfill.makeLogger("error", process.stdout, process.stderr);
  const hash = hashes[info.name];

  log.verbose("fetchBackfill", `fetch started for ${info.name}`);

  try {
    const cacheHit = await backfill.fetch(
      packagePath,
      hash,
      logger,
      cacheConfig
    );
    cacheHits[info.name] = cacheHit;
  } catch (e) {
    log.error(`${info.name} fetchBackfill`, e);
  }

  log.verbose("fetchBackfill", `fetch done for ${info.name}`);
}

export async function putBackfill(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[info.name];

  log.verbose("putBackfill", `put started for ${info.name}`);

  try {
    await backfill.put(packagePath, hash, logger, cacheConfig);
  } catch (e) {
    // sometimes outputGlob don't match any files, so skipping this
  }

  log.verbose("putBackfill", `put done for ${info.name}`);
}

export { cacheHits };
