import * as backfill from "backfill/lib/api";
import { PackageInfo } from "workspace-tools";
import path from "path";
import { RunContext } from "../types/RunContext";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function computeHash(info: PackageInfo, context: RunContext) {
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const name = info.name;

  logger.setName(name);

  const hash = await backfill.computeHash(
    path.dirname(info.packageJsonPath),
    logger,
    context.command + context.args.join(" ")
  );

  hashes[info.name] = hash;
}

export async function fetchBackfill(info: PackageInfo) {
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[info.name];
  const cwd = path.dirname(info.packageJsonPath);

  const cacheHit = await backfill.fetch(cwd, hash, logger);

  cacheHits[info.name] = cacheHit;
}

export async function putBackfill(info: PackageInfo) {
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[info.name];
  const cwd = path.dirname(info.packageJsonPath);

  try {
    await backfill.put(cwd, hash, logger);
  } catch (e) {
    // here we swallow put errors because backfill will throw just because the output directories didn't exist
  }
}

export { cacheHits };
