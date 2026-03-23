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
const TAR_BLOCK_SIZE = 512;

export interface LocalTarCacheProviderOptions {
  root: string;
  logger: Logger;
  outputGlob?: string[];
}

interface TarFileEntry {
  path: string;
  data: Buffer;
  mode: number;
  mtime: Date;
}

/**
 * Tar-based local cache provider.
 *
 * Instead of copying every output file individually (one syscall per file),
 * this provider packs all outputs into a single `.tar` file on `put()` and
 * extracts on `fetch()`.  This dramatically reduces I/O overhead on file
 * systems where per-file operations are expensive (e.g. NTFS).
 *
 * Both `put()` and `fetch()` use optimised bulk I/O paths:
 *
 * - **put()** reads all output files into memory in parallel, constructs
 *   the tar archive as a single buffer, and writes it with one `writeFile`
 *   call.  This avoids the per-file `stat` → `read` → stream pipeline
 *   that `tar.create()` performs sequentially via Minipass.
 *
 * - **fetch()** parses the tar into memory buffers, then writes every file
 *   out in parallel via `Promise.all(writeFile(...))`.  This avoids the
 *   sequential `mkdir` + `lstat` + `chmod` + stream-write that
 *   `tar.extract()` performs per entry.
 */
export class LocalTarCacheProvider implements CacheProvider {
  constructor(private options: LocalTarCacheProviderOptions) {}

  private getTarCacheDir(): string {
    return path.join(getCacheDirectoryRoot(this.options.root), "cache");
  }

  private getTarPath(hash: string): string {
    return path.join(this.getTarCacheDir(), hash.substring(0, 4), `${hash}.tar`);
  }

  /**
   * Build a tar buffer from in-memory file entries.
   *
   * Uses `tar.Header` for spec-correct header encoding, then concatenates
   * header + data + padding for every entry, finishing with the standard
   * two-block end-of-archive marker.
   */
  private buildTarBuffer(entries: TarFileEntry[]): Buffer {
    const parts: Buffer[] = [];

    for (const entry of entries) {
      const header = new tar.Header({
        path: entry.path,
        size: entry.data.length,
        mode: entry.mode & 0o7777,
        mtime: entry.mtime,
        type: "File",
        uid: 0,
        gid: 0,
      });
      header.encode();

      parts.push(header.block!);
      parts.push(entry.data);

      const remainder = entry.data.length % TAR_BLOCK_SIZE;
      if (remainder > 0) {
        parts.push(Buffer.alloc(TAR_BLOCK_SIZE - remainder));
      }
    }

    // End-of-archive: two 512-byte zero blocks
    parts.push(Buffer.alloc(TAR_BLOCK_SIZE * 2));

    return Buffer.concat(parts);
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
      // Parse the tar into memory, then write all files in parallel.
      // This is ~5-7x faster than tar.extract() which does sequential
      // mkdir + lstat + chmod + stream-write per entry.
      const entries: TarFileEntry[] = [];
      const dirs = new Set<string>();
      const parser = new tar.Parser();

      parser.on("entry", (entry) => {
        if (entry.type === "Directory") {
          dirs.add(entry.path);
          entry.resume();
        } else {
          const chunks: Buffer[] = [];
          entry.on("data", (chunk: Buffer) => chunks.push(chunk));
          entry.on("end", () => {
            entries.push({
              path: entry.path,
              data: Buffer.concat(chunks),
              mode: entry.mode ?? 0o666,
              mtime: entry.mtime ?? new Date(),
            });
          });
        }
      });

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(tarPath);
        readStream.pipe(parser);
        parser.on("end", resolve);
        parser.on("error", reject);
        readStream.on("error", reject);
      });

      // Collect and create all needed directories
      const allDirs = new Set<string>();
      for (const entry of entries) {
        allDirs.add(path.dirname(path.join(target.cwd, entry.path)));
      }
      for (const d of dirs) {
        allDirs.add(path.join(target.cwd, d));
      }
      for (const d of [...allDirs].sort()) {
        fs.mkdirSync(d, { recursive: true });
      }

      // Write all files in parallel
      await Promise.all(entries.map((entry) => fs.promises.writeFile(path.join(target.cwd, entry.path), entry.data)));

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

      // Read all output files in parallel, then build and write the tar
      // in one shot. This is dramatically faster than tar.create() which
      // processes each file sequentially through Minipass streams.
      const fileEntries: TarFileEntry[] = await Promise.all(
        files.map(async (filePath) => {
          const fullPath = path.join(target.cwd, filePath);
          const [data, fileStat] = await Promise.all([fs.promises.readFile(fullPath), fs.promises.stat(fullPath)]);
          return {
            path: filePath,
            data,
            mode: fileStat.mode,
            mtime: fileStat.mtime,
          };
        })
      );

      const tarBuffer = this.buildTarBuffer(fileEntries);
      const tarPath = this.getTarPath(hash);
      fs.mkdirSync(path.dirname(tarPath), { recursive: true });
      await fs.promises.writeFile(tarPath, tarBuffer);
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
