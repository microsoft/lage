import path from "path";
import fs from "fs-extra";
import globby from "globby";
import { randomBytes } from "crypto";
import { lstat, promises as fsPromises, type BigIntStats } from "fs";
import pLimit from "p-limit";

import type { Logger } from "backfill-logger";
import { CacheStorage } from "./CacheStorage.js";
import { computeHash } from "./hashFile.js";
import {
  getNativeOutputValidator,
  type NativeOutputValidator,
} from "./nativeOutputValidator.js";

type FileState = [cache: string, output: string];

interface LocalCacheState {
  version: 1;
  cwd: string;
  cache: string;
  complete: boolean;
  files: Record<string, FileState>;
}

// Bound open files across targets, not just within a single cache entry.
const fileOperations = pLimit(64);
const statBatches = pLimit(4);
const STAT_BATCH_SIZE = 256;

export class LocalCacheStorage extends CacheStorage {
  /**
   * @param internalCacheFolder Relative path to the cache folder, such as `node_modules/.cache/backfill`
   */
  constructor(
    private internalCacheFolder: string,
    logger: Logger,
    cwd: string,
    incrementalCaching = false
  ) {
    super(logger, cwd, incrementalCaching);
  }

  /** Get the local cache folder for a given hash */
  protected getLocalCacheFolder(hash: string): string {
    return path.resolve(this.cwd, this.internalCacheFolder, hash);
  }

  public async isUpToDate(hash: string): Promise<boolean> {
    const nativeValidator = getNativeOutputValidator(this.logger);
    const localCacheFolder = this.getLocalCacheFolder(hash);
    const [state, cacheStat] = await Promise.all([
      this.readState(localCacheFolder),
      getStat(localCacheFolder),
    ]);
    if (
      !state?.complete ||
      !cacheStat?.isDirectory() ||
      state.cache !== fingerprint(cacheStat)
    ) {
      return false;
    }

    const valid = await validateOutputs(this.cwd, state.files, nativeValidator);
    return (
      valid && state.cache === fingerprint(await getStat(localCacheFolder))
    );
  }

  protected async _fetch(hash: string): Promise<boolean> {
    const localCacheFolder = this.getLocalCacheFolder(hash);
    const cacheStat = await getStat(localCacheFolder);

    if (!cacheStat?.isDirectory()) {
      return false;
    }

    const [files, previousState] = await Promise.all([
      globby(["**/*"], { cwd: localCacheFolder, dot: true }),
      this.readState(localCacheFolder),
    ]);
    const state: LocalCacheState = {
      version: 1,
      cwd: path.resolve(this.cwd),
      cache: fingerprint(cacheStat)!,
      complete: false,
      files: Object.create(null),
    };
    const madeDirs = new Map<string, Promise<unknown>>();
    let changed = !previousState;

    await forEachFile(files, async (file) => {
      const src = path.join(localCacheFolder, file);
      const dest = path.join(this.cwd, file);
      const [srcStat, destStat] = await Promise.all([
        getStat(src),
        getStat(dest),
      ]);
      const previous = previousState?.files[file];
      const current = getFileState(srcStat, destStat);

      if (
        current &&
        Array.isArray(previous) &&
        current[0] === previous[0] &&
        current[1] === previous[1]
      ) {
        state.files[file] = current;
        return;
      }

      changed = true;
      let verified = await verifyContents(src, dest, srcStat, destStat);
      if (!verified) {
        await ensureDirectory(path.dirname(dest), madeDirs);
        const stagingFile = uniquePath(dest);
        try {
          await fsPromises.copyFile(
            src,
            stagingFile,
            fs.constants.COPYFILE_EXCL
          );
          await fs.rename(stagingFile, dest);
        } finally {
          await fs.remove(stagingFile);
        }
        const [copiedSrcStat, copiedDestStat] = await Promise.all([
          getStat(src),
          getStat(dest),
        ]);
        verified = await verifyContents(
          src,
          dest,
          copiedSrcStat,
          copiedDestStat
        );
        if (
          !copiedSrcStat ||
          !copiedDestStat?.isFile() ||
          (getFileState(copiedSrcStat, copiedDestStat) && !verified)
        ) {
          throw new Error(
            `Local cache output changed while restoring: ${file}`
          );
        }
      }

      if (verified) {
        state.files[file] = verified;
      }
    });

    if (
      fingerprint(cacheStat) !== fingerprint(await getStat(localCacheFolder))
    ) {
      throw new Error(`Local cache entry changed while fetching: ${hash}`);
    }

    state.complete = files.length === Object.keys(state.files).length;
    if (
      changed ||
      state.cache !== previousState?.cache ||
      state.complete !== previousState?.complete ||
      files.length !== Object.keys(previousState?.files ?? {}).length
    ) {
      await this.writeState(localCacheFolder, state);
    }
    return true;
  }

  protected async _put(hash: string, filesToCache: string[]): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);
    const stagingFolder = uniquePath(localCacheFolder);
    const previousFolder = uniquePath(localCacheFolder);
    const state: LocalCacheState = {
      version: 1,
      cwd: path.resolve(this.cwd),
      cache: "",
      complete: false,
      files: Object.create(null),
    };
    const madeDirs = new Map<string, Promise<unknown>>();

    await fs.mkdirp(stagingFolder);

    try {
      await forEachFile(filesToCache, async (file) => {
        const src = path.join(this.cwd, file);
        const dest = path.join(stagingFolder, file);
        const before = await getStat(src);
        await ensureDirectory(path.dirname(dest), madeDirs);
        if (before?.isFile()) {
          await fsPromises.copyFile(src, dest);
        } else {
          await fs.copy(src, dest);
        }
        const [after, cached] = await Promise.all([
          getStat(src),
          getStat(dest),
        ]);
        let fileState = getFileState(cached, after);
        if (fingerprint(before) !== fingerprint(after)) {
          fileState = await verifyContents(dest, src, cached, after);
          if (!fileState) {
            throw new Error(
              `Local cache output changed while caching: ${file}`
            );
          }
        }
        if (fileState) {
          state.files[file] = fileState;
        }
      });

      const stagedStat = await getStat(stagingFolder);
      try {
        await fs.rename(localCacheFolder, previousFolder);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      try {
        // Readers can miss during replacement, but never observe partially written entries.
        await fs.rename(stagingFolder, localCacheFolder);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (
          (code === "EEXIST" ||
            code === "ENOTEMPTY" ||
            (process.platform === "win32" && code === "EPERM")) &&
          (await getStat(localCacheFolder))?.isDirectory()
        ) {
          return;
        }
        throw error;
      }
      const publishedStat = await getStat(localCacheFolder);
      if (
        !publishedStat ||
        stagedStat?.ino !== publishedStat.ino ||
        stagedStat.dev !== publishedStat.dev ||
        stagedStat.birthtimeNs !== publishedStat.birthtimeNs
      ) {
        return;
      }
      state.cache = fingerprint(publishedStat)!;
      state.complete = filesToCache.length === Object.keys(state.files).length;
      await this.writeState(localCacheFolder, state);
    } finally {
      await fs.remove(stagingFolder);
      await fs.remove(previousFolder);
    }
  }

  private async readState(
    localCacheFolder: string
  ): Promise<LocalCacheState | undefined> {
    try {
      const state: Partial<LocalCacheState> | null = JSON.parse(
        await fs.readFile(`${localCacheFolder}.state.json`, "utf8")
      );
      if (
        state?.version === 1 &&
        state.cwd === path.resolve(this.cwd) &&
        typeof state.cache === "string" &&
        typeof state.complete === "boolean" &&
        state.files &&
        typeof state.files === "object" &&
        !Array.isArray(state.files)
      ) {
        return state as LocalCacheState;
      }
    } catch (error) {
      if (
        !(error instanceof SyntaxError) &&
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        this.logger.verbose("Ignoring invalid local cache output metadata");
      }
    }
    return undefined;
  }

  private async writeState(
    localCacheFolder: string,
    state: LocalCacheState
  ): Promise<void> {
    const stateFile = `${localCacheFolder}.state.json`;
    const stagingFile = uniquePath(stateFile);
    try {
      await fs.writeFile(stagingFile, JSON.stringify(state), { flag: "wx" });
      await fs.rename(stagingFile, stateFile);
    } finally {
      await fs.remove(stagingFile);
    }
  }
}

function uniquePath(filename: string): string {
  return `${filename}.${process.pid}.${randomBytes(8).toString("hex")}.backfill`;
}

async function forEachFile(
  files: string[],
  action: (file: string) => Promise<void>
): Promise<void> {
  const results = await Promise.allSettled(
    files.map((file) => fileOperations(() => action(file)))
  );
  const failed = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failed) {
    throw failed.reason;
  }
}

function ensureDirectory(
  directory: string,
  madeDirs: Map<string, Promise<unknown>>
): Promise<unknown> {
  let created = madeDirs.get(directory);
  if (!created) {
    created = fs.mkdirp(directory);
    madeDirs.set(directory, created);
  }
  return created;
}

async function getStat(filename: string): Promise<BigIntStats | undefined> {
  try {
    return await fsPromises.lstat(filename, { bigint: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      throw error;
    }
    return undefined;
  }
}

function fingerprint(stat: BigIntStats | undefined): string | undefined {
  return (
    stat &&
    `${stat.dev}:${stat.ino}:${stat.mode}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`
  );
}

async function validateOutputs(
  cwd: string,
  entries: Record<string, FileState>,
  nativeValidator?: NativeOutputValidator
): Promise<boolean> {
  const files = Object.keys(entries);
  if (nativeValidator) {
    const fingerprints: string[] = [];
    for (const file of files) {
      const previous = entries[file];
      if (!Array.isArray(previous) || typeof previous[1] !== "string") {
        return false;
      }
      fingerprints.push(previous[1]);
    }
    return nativeValidator(path.resolve(cwd), files, fingerprints);
  }
  const prefix = path.resolve(cwd) + path.sep;

  for (let start = 0; start < files.length; start += STAT_BATCH_SIZE) {
    const end = Math.min(start + STAT_BATCH_SIZE, files.length);
    // One promise per batch avoids allocating several promises for every output.
    const valid = await statBatches(
      () =>
        new Promise<boolean>((resolve, reject) => {
          let pending = end - start;
          let matches = true;
          let failure: NodeJS.ErrnoException | undefined;
          const finish = () => {
            if (--pending === 0) {
              if (failure) {
                reject(failure);
              } else {
                resolve(matches);
              }
            }
          };

          for (let index = start; index < end; index++) {
            const file = files[index];
            const previous = entries[file];
            if (
              !file ||
              /(^[\\/])|(^|[\\/])\.\.([\\/]|$)|:/.test(file) ||
              file.includes("\0") ||
              !Array.isArray(previous) ||
              typeof previous[1] !== "string"
            ) {
              matches = false;
              finish();
              continue;
            }
            const output =
              prefix + (path.sep === "\\" ? file.replace(/\//g, "\\") : file);
            lstat(output, { bigint: true }, (error, stat) => {
              if (
                error ||
                !stat.isFile() ||
                fingerprint(stat) !== previous[1]
              ) {
                matches = false;
              }
              if (
                error &&
                error.code !== "ENOENT" &&
                error.code !== "ENOTDIR"
              ) {
                failure = error;
              }
              finish();
            });
          }
        })
    );
    if (!valid) {
      return false;
    }
  }
  return true;
}

function getFileState(
  src: BigIntStats | undefined,
  dest: BigIntStats | undefined
): FileState | undefined {
  // Do not trust symlink metadata or filesystems without usable file identities/status timestamps.
  if (
    src?.isFile() &&
    dest?.isFile() &&
    src.ino &&
    dest.ino &&
    src.ctimeNs &&
    dest.ctimeNs
  ) {
    return [fingerprint(src)!, fingerprint(dest)!];
  }
  return undefined;
}

async function verifyContents(
  src: string,
  dest: string,
  srcStat: BigIntStats | undefined,
  destStat: BigIntStats | undefined
): Promise<FileState | undefined> {
  // A first read can update an empty file's NTFS status timestamp. Retry the entire
  // verification once, never just accept new metadata without re-reading the bytes.
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = getFileState(srcStat, destStat);
    if (
      !before ||
      srcStat!.size !== destStat!.size ||
      srcStat!.mode !== destStat!.mode
    ) {
      return undefined;
    }
    const [srcHash, destHash] = await Promise.all([
      computeHash(src, "sha256"),
      computeHash(dest, "sha256"),
    ]);
    [srcStat, destStat] = await Promise.all([getStat(src), getStat(dest)]);
    const after = getFileState(srcStat, destStat);
    if (srcHash !== destHash) {
      return undefined;
    }
    if (before[0] === after?.[0] && before[1] === after[1]) {
      return after;
    }
  }
  return undefined;
}
