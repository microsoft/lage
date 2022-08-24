import { Logger } from "@lage-run/logger";
import { stat } from "fs/promises";
import fs from "fs";
import path from "path";
import { getCacheDir, removeCacheEntry } from "./cacheDir";
import { getWorkspaces } from "workspace-tools";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export async function pruneCache(pruneDays: number, cwd: string, internalCacheFolder: string, logger: Logger) {
  const prunePeriod = pruneDays || 30;
  const now = new Date();
  const workspaces = getWorkspaces(cwd);
  for (const workspace of workspaces) {
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);

    if (fs.existsSync(cachePath)) {
      const entries = fs.readdirSync(cachePath);

      logger.info(`prune cache for ${workspace.name} older than ${prunePeriod} days`);

      for (const entry of entries) {
        const entryPath = path.join(cachePath, entry);
        const entryStat = await stat(entryPath);

        if (now.getTime() - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
          await removeCacheEntry(entryPath, entryStat);
        }
      }
    }
  }
}
