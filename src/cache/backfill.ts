import * as backfill from "backfill/lib/api";
import { PackageInfo } from "workspace-tools";
import path from "path";
import { RunContext } from "../types/RunContext";
import { getCacheConfig } from "./cacheConfig";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function computeHash(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);

  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const name = info.name;

  logger.setName(name);

  const hash = await backfill.computeHash(
    packagePath,
    logger,
    context.command + context.args.join(" "),
    cacheConfig
  );

  hashes[info.name] = hash;
}

export async function fetchBackfill(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[info.name];
  const cwd = path.dirname(packagePath);

  const cacheHit = await backfill.fetch(cwd, hash, logger, cacheConfig);

  cacheHits[info.name] = cacheHit;
}

export async function putBackfill(info: PackageInfo, context: RunContext) {
  const packagePath = path.dirname(info.packageJsonPath);
  const cacheConfig = getCacheConfig(packagePath, context);
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[info.name];
  const cwd = path.dirname(packagePath);

  try {
    await backfill.put(cwd, hash, logger, cacheConfig);
  } catch (e) {
    // here we swallow put errors because backfill will throw just because the output directories didn't exist
  }
}

export { cacheHits };
