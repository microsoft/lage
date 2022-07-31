import { CacheProvider } from "../types/CacheProvider";

import { createDefaultConfig } from "backfill-config";
import { getCacheStorageProvider } from "backfill-cache";
import { getPackageInfos, PackageInfo } from "workspace-tools";
import { Hasher } from "backfill-hasher";
import { makeLogger } from "backfill-logger";

import { promisify } from "util";
import { salt } from "../salt";
import { Target } from "@lage-run/target-graph";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CacheOptions } from "../types/CacheOptions";
import type { Logger as BackfillLogger } from "backfill-logger";

const rmdir = promisify(fs.rmdir);
const rm = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export class BackfillCacheProvider implements CacheProvider {
  /**
   * logger for backfill
   */
  private backfillLogger: BackfillLogger;

  private getCacheStorageProvider(cwd: string) {
    const { cacheStorageConfig, internalCacheFolder, incrementalCaching } = this.cacheOptions;
    return getCacheStorageProvider(
      cacheStorageConfig ?? { provider: "local" },
      internalCacheFolder,
      this.backfillLogger,
      cwd,
      incrementalCaching
    );
  }

  constructor(private root: string, private cacheOptions: CacheOptions) {
    this.backfillLogger = createBackfillLogger();
  }

  hash(target: Target, args?: any): Promise<string> {
    const hashKey = salt(
      this.cacheOptions.environmentGlob || ["lage.config.js"],
      `${target.id}|${JSON.stringify(args)}`,
      this.root,
      this.cacheOptions.cacheKey
    );
    const hasher = new Hasher({ packageRoot: target.cwd }, this.backfillLogger);
    return hasher.createPackageHash(hashKey);
  }

  async fetch(hash: string, target: Target): Promise<boolean> {
    if (!hash) {
      return false;
    }

    const cacheStorage = this.getCacheStorageProvider(target.cwd);

    try {
      return await cacheStorage.fetch(hash);
    } catch (e) {
      // backfill fetch can error, but we should simply ignore and continue
      return false;
    }
  }

  async put(hash: string, target: Target): Promise<void> {
    if (!hash) {
      return;
    }

    const cacheStorage = this.getCacheStorageProvider(target.cwd);

    try {
      await cacheStorage.put(hash, target.outputs ?? this.cacheOptions.outputGlob ?? ["**/*"]);
    } catch (e) {
      // backfill throws an error if outputGlob doesn't match any files, we will skip this error
    }
  }

  async clear(): Promise<void> {
    const allPackages = getPackageInfos(this.root);
    for (const info of Object.values(allPackages)) {
      const cachePath = getCachePath(info, this.cacheOptions.internalCacheFolder);

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
    const allPackages = getPackageInfos(this.root);
    for (const info of Object.values(allPackages)) {
      const cachePath = getCachePath(info, this.cacheOptions.internalCacheFolder);

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

function createBackfillLogger() {
  const stdout = process.stdout;
  const stderr = process.stderr;
  return makeLogger("error", {
    console: {
      info(...args) {
        stdout.write(args.join(" ") + os.EOL);
      },
      warn(...args) {
        stderr.write(args.join(" ") + os.EOL);
      },
      error(...args) {
        stderr.write(args.join(" ") + os.EOL);
      },
    },
  });
}

export function createCacheConfig(cwd: string, cacheOptions: Partial<CacheOptions> = {}) {
  return {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
  };
}