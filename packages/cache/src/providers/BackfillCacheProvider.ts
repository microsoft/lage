import { createBackfillCacheConfig, createBackfillLogger } from "../backfillWrapper.js";
import { getCacheStorageProvider } from "backfill-cache";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type { CacheProvider } from "../types/CacheProvider.js";
import type { CacheOptions } from "@lage-run/config";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { Target } from "@lage-run/target-graph";
import type { Logger } from "@lage-run/logger";
import { getCacheDirectory, getCacheDirectoryRoot } from "../getCacheDirectory.js";
import { chunkPromise } from "../chunkPromise.js";

const rm = promisify(fs.rm);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export interface BackfillCacheProviderOptions {
  root: string;
  logger: Logger;
  cacheOptions: Partial<CacheOptions>;
}

export class BackfillCacheProvider implements CacheProvider {
  /**
   * logger for backfill
   */
  private backfillLogger: BackfillLogger;

  private getTargetCacheStorageProvider(cwd: string, hash: string) {
    const { cacheOptions } = this.options;
    const { cacheStorageConfig, incrementalCaching } = createBackfillCacheConfig(cwd, cacheOptions, this.backfillLogger);

    const cachePath = this.getCachePath(cwd, hash);

    return getCacheStorageProvider(cacheStorageConfig ?? { provider: "local" }, cachePath, this.backfillLogger, cwd, incrementalCaching);
  }

  constructor(private options: BackfillCacheProviderOptions) {
    this.backfillLogger = createBackfillLogger();
  }

  public async fetch(hash: string, target: Target): Promise<boolean> {
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

  public async put(hash: string, target: Target): Promise<void> {
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

  public async clear(concurrency = 10): Promise<void> {
    return this.purge(0, concurrency);
  }

  public async purge(prunePeriod = 30, concurrency = 10): Promise<void> {
    const now = new Date();

    const cacheTypes = ["cache", "logs"];
    const entries: string[] = [];

    for (const cacheType of cacheTypes) {
      const cacheTypeDirectory = path.join(getCacheDirectoryRoot(this.options.root), cacheType);
      if (fs.existsSync(cacheTypeDirectory)) {
        const hashPrefixes = await readdir(cacheTypeDirectory);
        for (const prefix of hashPrefixes) {
          const cachePath = path.join(cacheTypeDirectory, prefix);
          entries.push(cachePath);
        }
      }
    }

    await chunkPromise(
      entries.map((entry) => {
        return async () => {
          const entryPath = entry;
          const entryStat = await stat(entryPath);

          if (now.getTime() - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
            await removeCache(entryPath, entryStat);
          }
        };
      }),
      concurrency
    );
  }

  private getCachePath(packagePath: string, hash: string): string {
    return path.relative(packagePath, getCacheDirectory(this.options.root, hash));
  }
}

async function removeCache(cachePath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    return rm(cachePath, { recursive: true });
  } else {
    return rm(cachePath);
  }
}
