import fs, { Stats } from "fs";
import path from "path";
import { PackageInfo } from "workspace-tools";
import { logger } from "../logger";
import { CacheOptions } from "../types/CacheOptions";
import { Config } from "../types/Config";
import { getWorkspace } from "../workspace/getWorkspace";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export async function cache(cwd: string, config: Config) {
  if (config.clear) {
    logger.info("clearing cache, this may take a while");
    clearCache(cwd, config);
    logger.info("done!");
  } else if (config.prune) {
    logger.info("pruning cache, this may take a while");
    pruneCache(cwd, config);
    logger.info("done!");
  } else {
    logger.info("No options given to cache command. Try --clear or --prune");
  }
}

function clearCache(cwd: string, config: Config) {
  const workspace = getWorkspace(cwd, config);
  const { allPackages } = workspace;
  for (const info of Object.values(allPackages)) {
    const cachePath = getCachePath(info, config.cacheOptions);

    if (fs.existsSync(cachePath)) {
      const entries = fs.readdirSync(cachePath);
      for (const entry of entries) {
        logger.verbose(`clearing cache for ${info.name}`);

        const entryPath = path.join(cachePath, entry);
        const entryStat = fs.statSync(entryPath);
        remove(entryPath, entryStat);
      }
    }
  }
}

function pruneCache(cwd: string, config: Config) {
  const prunePeriod = parseInt(config.prune) || 30;
  const now = new Date();
  const workspace = getWorkspace(cwd, config);
  const { allPackages } = workspace;
  for (const info of Object.values(allPackages)) {
    const cachePath = getCachePath(info, config.cacheOptions);

    if (fs.existsSync(cachePath)) {
      const entries = fs.readdirSync(cachePath);

      for (const entry of entries) {
        const entryPath = path.join(cachePath, entry);
        const entryStat = fs.statSync(entryPath);

        logger.verbose(`clearing cache for ${info.name}`);

        if (now.getTime() - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
          remove(entryPath, entryStat);
        }
      }
    }
  }
}

function getCachePath(info: PackageInfo, cacheOptions: CacheOptions) {
  const cacheFolder = !cacheOptions.internalCacheFolder ? undefined : `../${cacheOptions.internalCacheFolder}`;

  return path.join(info.packageJsonPath, cacheFolder ?? "../node_modules/.cache/backfill");
}

function remove(entryPath: string, entryStat: Stats) {
  if (entryStat.isDirectory()) {
    fs.rmdirSync(entryPath, { recursive: true });
  } else {
    fs.unlinkSync(entryPath);
  }
}
