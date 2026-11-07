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

    const files = await globby([`**/*`], {
      cwd: localCacheFolder,
      dot: true,
    });

    const madeDirs: Record<string, string> = {};

    await Promise.all(
      files.map(async (file) => {
        const src = path.join(localCacheFolder, file);
        const dest = path.join(this.cwd, file);

        // Previously, some logic was added attempting to only copy files with a different mtime.
        // However, this never worked because it was implemented with files.filter(async f => { ... }),
        // which returns a promise, which is always truthy. It's also unclear whether this would
        // have any benefit for a local cache specific to the current repo when combined with the
        // hashing logic in other places (plus tools such as tsc will usually overwrite all files).
        // If this was desired in the future, the proper logic would be as follows:
        //   const [srcStat, destStat] = await Promise.all([
        //     fsPromises.stat(src, { bigint: true }).catch(() => null),
        //     fsPromises.stat(dest, { bigint: true }).catch(() => null),
        //   ]);
        //   if (srcStat && destStat && srcStat.mtimeNs === destStat.mtimeNs) return;

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

    await fs.mkdirp(localCacheFolder);

    await Promise.all(
      filesToCache.map(async (file) => {
        const destinationFolder = path.join(
          localCacheFolder,
          path.dirname(file)
        );
        await fs.mkdirp(destinationFolder);
        await fs.copy(
          path.join(this.cwd, file),
          path.join(localCacheFolder, file)
        );
      })
    );
  }
}
