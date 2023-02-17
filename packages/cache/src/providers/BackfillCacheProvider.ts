import { createBackfillCacheConfig, createBackfillLogger } from "../backfillWrapper.js";
import { getCacheStorageProvider } from "backfill-cache";
import { getPackageInfos } from "workspace-tools";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type { CacheProvider, CacheProviderOptions } from "../types/CacheProvider.js";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { PackageInfo } from "workspace-tools";
import type { Target } from "@lage-run/target-graph";
import type { Logger } from "@lage-run/logger";

const rmdir = promisify(fs.rmdir);
const rm = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export interface BackfillCacheProviderOptions {
  root: string;
  logger: Logger;
  cacheOptions: Partial<CacheProviderOptions>;
}

export class BackfillCacheProvider implements CacheProvider {
  /**
   * logger for backfill
   */
  private backfillLogger: BackfillLogger;
  private cacheDirectory: string;

  private getTargetCacheStorageProvider(cwd: string, hash: string) {
    const { cacheOptions } = this.options;
    const { cacheStorageConfig, incrementalCaching } = createBackfillCacheConfig(cwd, cacheOptions, this.backfillLogger);

    const cachePath = this.getCachePath(cwd, hash);

    return getCacheStorageProvider(cacheStorageConfig ?? { provider: "local" }, cachePath, this.backfillLogger, cwd, incrementalCaching);
  }

  constructor(private options: BackfillCacheProviderOptions) {
    this.cacheDirectory = path.join(options.root, "node_modules/.lage/cache");
    this.backfillLogger = createBackfillLogger();
  }

  async fetch(hash: string, target: Target): Promise<boolean> {
    const { logger } = this.options;

    if (!hash) {
      return false;
    }

    const cacheStorage = this.getTargetCacheStorageProvider(target.cwd, hash);

    try {
      return await cacheStorage.fetch(hash);
    } catch (error) {
      let message;

      if (error instanceof Error) {
        message = error.message;
      } else message = String(error);

      logger.silly(`Cache fetch failed: ${message}`, { target });

      // backfill fetch can error, but we should simply ignore and continue
      return false;
    }
  }

  async put(hash: string, target: Target): Promise<void> {
    const { logger } = this.options;

    if (!hash) {
      return;
    }

    const cacheStorage = this.getTargetCacheStorageProvider(target.cwd, hash);

    try {
      await cacheStorage.put(hash, target.outputs ?? this.options.cacheOptions.outputGlob ?? ["**/*"]);
    } catch (error) {
      let message;

      if (error instanceof Error) {
        message = error.message;
      } else message = String(error);

      logger.silly(`Cache fetch failed: ${message}`, { target });

      // backfill throws an error if outputGlob doesn't match any files, we will skip this error
    }
  }

  async clear(): Promise<void> {
    const cachePath = this.cacheDirectory;

    if (fs.existsSync(cachePath)) {
      const entries = await readdir(cachePath);
      for (const entry of entries) {
        const entryPath = path.join(cachePath, entry);
        const entryStat = await stat(entryPath);

        await removeCache(entryPath, entryStat);
      }
    }
  }

  async purge(sinceDays: number): Promise<void> {
    const prunePeriod = sinceDays || 30;
    const now = new Date();
    const allPackages = getPackageInfos(this.options.root);
    for (const info of Object.values(allPackages)) {
      const cachePath = this.cacheDirectory;

      if (fs.existsSync(cachePath)) {
        const entries = await readdir(cachePath);

        for (const entry of entries) {
          const entryPath = path.join(cachePath, entry);
          const entryStat = await stat(entryPath);

          if (now.getTime() - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
            await removeCache(entryPath, entryStat);
          }
        }
      }
    }
  }

  getCachePath(packagePath: string, hash: string) {
    const relativePath = path.relative(packagePath, path.join(this.cacheDirectory, hash.substring(0, 4)));
    return relativePath;
  }
}

async function removeCache(cachePath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    rmdir(cachePath, { recursive: true });
  } else {
    rm(cachePath);
  }
}
