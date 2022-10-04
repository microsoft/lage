import cache from "@actions/cache";
import { CustomStorageConfig } from "backfill-config";
import { Logger } from "backfill-logger";

const cacheProvider: CustomStorageConfig = {
  provider: (_logger: Logger, cwd: string) => {
    return {
      async fetch(hash: string): Promise<boolean> {
        if (!hash) {
          return false;
        }

        const paths = [`${cwd}/**`];
        const restoreKeys = ["lage-"];
        const cacheKey = await cache.restoreCache(paths, hash, restoreKeys);

        return !!cacheKey;
      },

      async put(hash: string, filesToCache: string[]): Promise<void> {
        if (!hash) {
          return;
        }

        await cache.saveCache(filesToCache, hash);
      },
    };
  },
  name: "github-actions",
};

export { cacheProvider };
