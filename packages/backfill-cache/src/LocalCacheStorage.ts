import path from "path";
import fs from "fs-extra";
import globby from "globby";

import type { Logger } from "backfill-logger";
import { CacheStorage } from "./CacheStorage.js";

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

  protected async _fetch(hash: string): Promise<boolean> {
    const localCacheFolder = this.getLocalCacheFolder(hash);
    if (!fs.existsSync(localCacheFolder)) {
      return false;
    }

    const files = await globby(["**/*"], { cwd: localCacheFolder, dot: true });
    const madeDirs: Record<string, string> = {};

    await Promise.all(
      files.map(async (file) => {
        const src = path.join(localCacheFolder, file);
        const dest = path.join(this.cwd, file);
        const destDir = path.dirname(dest);
        if (!madeDirs[destDir]) {
          await fs.mkdirp(destDir);
          madeDirs[destDir] = destDir;
        }
        await fs.copyFile(src, dest);
      })
    );
    return true;
  }

  protected async _put(hash: string, filesToCache: string[]): Promise<void> {
    const localCacheFolder = this.getLocalCacheFolder(hash);
    // A legacy writer cannot preserve an experimental proof for the same entry.
    await fs.remove(`${localCacheFolder}.state.json`);
    await fs.mkdirp(localCacheFolder);
    await Promise.all(
      filesToCache.map(async (file) => {
        await fs.mkdirp(path.join(localCacheFolder, path.dirname(file)));
        await fs.copy(
          path.join(this.cwd, file),
          path.join(localCacheFolder, file)
        );
      })
    );
  }
}
