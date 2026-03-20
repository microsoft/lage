import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as tar from "tar";
import { globAsync } from "@lage-run/globby";
import type { CacheProvider } from "../types/CacheProvider.js";
import type { Target } from "@lage-run/target-graph";
import type { Logger } from "@lage-run/logger";
import { getCacheDirectoryRoot } from "../getCacheDirectory.js";
import { chunkPromise } from "../chunkPromise.js";

const rm = promisify(fs.rm);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export interface LocalTarCacheProviderOptions {
  root: string;
  logger: Logger;
  outputGlob?: string[];
}

/**
 * Tar-based local cache provider.
 *
 * Instead of copying every output file individually (one syscall per file),
 * this provider packs all outputs into a single `.tar` file on `put()` and
 * extracts on `fetch()`.  This dramatically reduces I/O overhead on file
 * systems where per-file operations are expensive (e.g. NTFS).
 */
export class LocalTarCacheProvider implements CacheProvider {
  constructor(private options: LocalTarCacheProviderOptions) {}

  private getTarCacheDir(): string {
    return path.join(getCacheDirectoryRoot(this.options.root), "cache");
  }

  private getTarPath(hash: string): string {
    return path.join(this.getTarCacheDir(), hash.substring(0, 4), `${hash}.tar`);
  }

  public async fetch(hash: string, target: Target): Promise<boolean> {
    if (!hash) {
      return false;
    }

    const tarPath = this.getTarPath(hash);
    if (!fs.existsSync(tarPath)) {
      return false;
    }

    try {
      await tar.extract({ file: tarPath, cwd: target.cwd });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.logger.silly(`Tar cache fetch failed: ${message}`, { target });
      return false;
    }
  }

  public async put(hash: string, target: Target): Promise<void> {
    if (!hash) {
      return;
    }

    const outputGlob = target.outputs ?? this.options.outputGlob ?? ["**/*"];

    try {
      const files = await globAsync(outputGlob, { cwd: target.cwd });
      if (files.length === 0) {
        return;
      }

      const tarPath = this.getTarPath(hash);
      fs.mkdirSync(path.dirname(tarPath), { recursive: true });

      await tar.create({ file: tarPath, cwd: target.cwd }, files);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.logger.silly(`Tar cache put failed: ${message}`, { target });
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
        const prefixes = await readdir(cacheTypeDirectory);
        for (const prefix of prefixes) {
          entries.push(path.join(cacheTypeDirectory, prefix));
        }
      }
    }

    await chunkPromise(
      entries.map((entry) => {
        return async () => {
          const entryStat = await stat(entry);
          if (now.getTime() - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
            if (entryStat.isDirectory()) {
              await rm(entry, { recursive: true });
            } else {
              await rm(entry);
            }
          }
        };
      }),
      concurrency
    );
  }
}
