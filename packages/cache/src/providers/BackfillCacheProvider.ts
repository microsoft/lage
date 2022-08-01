import { createBackfillLogger } from "../backfillWrapper";
import { createDefaultConfig } from "backfill-config";
import { getCacheStorageProvider } from "backfill-cache";
import { getPackageInfos } from "workspace-tools";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type { CacheOptions } from "../types/CacheOptions";
import type { CacheProvider, CacheProviderOptions } from "../types/CacheProvider";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { PackageInfo } from "workspace-tools";
import type { Target } from "@lage-run/target-graph";

const rmdir = promisify(fs.rmdir);
const rm = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export interface BackfillCacheProviderOptions {
  root: string;
  cacheOptions: Partial<CacheProviderOptions>;
  isReadOnly?: boolean;
}

export class BackfillCacheProvider implements CacheProvider {
  /**
   * logger for backfill
   */
  private backfillLogger: BackfillLogger;

  private getTargetCacheStorageProvider(cwd: string) {
    const { cacheOptions } = this.options;
    const { cacheStorageConfig, internalCacheFolder, incrementalCaching } = createCacheConfig(cwd, cacheOptions);

    return getCacheStorageProvider(
      cacheStorageConfig ?? { provider: "local" },
      internalCacheFolder,
      this.backfillLogger,
      cwd,
      incrementalCaching
    );
  }

  constructor(private options: BackfillCacheProviderOptions) {
    this.backfillLogger = createBackfillLogger();
  }

  async fetch(hash: string, target: Target): Promise<boolean> {
    if (!hash) {
      return false;
    }

    const cacheStorage = this.getTargetCacheStorageProvider(target.cwd);

    try {
      return await cacheStorage.fetch(hash);
    } catch (e) {
      // backfill fetch can error, but we should simply ignore and continue
      return false;
    }
  }

  async put(hash: string, target: Target): Promise<void> {
    if (!hash || this.options.isReadOnly) {
      return;
    }

    const cacheStorage = this.getTargetCacheStorageProvider(target.cwd);

    try {
      await cacheStorage.put(hash, target.outputs ?? this.options.cacheOptions.outputGlob ?? ["**/*"]);
    } catch (e) {
      // backfill throws an error if outputGlob doesn't match any files, we will skip this error
    }
  }

  async clear(): Promise<void> {
    const allPackages = getPackageInfos(this.options.root);
    for (const info of Object.values(allPackages)) {
      const cachePath = getCachePath(info, this.options.cacheOptions.internalCacheFolder);

      if (fs.existsSync(cachePath)) {
        const entries = await readdir(cachePath);
        for (const entry of entries) {
          const entryPath = path.join(cachePath, entry);
          const entryStat = await stat(entryPath);

          await removeCache(entryPath, entryStat);
        }
      }
    }
  }

  async purge(sinceDays: number): Promise<void> {
    const prunePeriod = sinceDays || 30;
    const now = new Date();
    const allPackages = getPackageInfos(this.options.root);
    for (const info of Object.values(allPackages)) {
      const cachePath = getCachePath(info, this.options.cacheOptions.internalCacheFolder);

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
}

function getCachePath(info: PackageInfo, internalCacheFolder?: string) {
  return path.resolve(path.dirname(info.packageJsonPath), internalCacheFolder ?? "node_modules/.cache/backfill");
}

async function removeCache(cachePath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    rmdir(cachePath, { recursive: true });
  } else {
    rm(cachePath);
  }
}

function createCacheConfig(cwd: string, cacheOptions: Partial<CacheOptions> = {}) {
  return {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
  };
}
