import cache from "@actions/cache";
import type { CustomStorageConfig } from "backfill-config";
import type { Logger } from "backfill-logger";
import path from "path";
import { getWorkspaceManagerRoot } from "workspace-tools";

const root = getWorkspaceManagerRoot(process.cwd())!;

const cacheProvider: CustomStorageConfig = {
  provider: (_logger: Logger, cwd: string) => {
    return {
      async fetch(hash: string): Promise<boolean> {
        if (!hash) {
          return false;
        }

        const paths = [path.relative(root, path.join(cwd, "**"))];
        const restoreKeys = ["lage-"];

        const cacheKey = await cache.restoreCache(paths, hash, restoreKeys);

        return !!cacheKey;
      },

      async put(hash: string, filesToCache: string[]): Promise<void> {
        if (!hash) {
          return;
        }

        const paths = filesToCache.map((files) => path.relative(root, path.join(cwd, files)));

        await cache.saveCache(paths, hash);
      },
    };
  },
  name: "github-actions",
};

export { cacheProvider };
