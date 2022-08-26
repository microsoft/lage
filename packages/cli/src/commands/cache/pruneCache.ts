import { Logger } from "@lage-run/logger";
import { stat } from "fs/promises";
import fs from "fs";
import path from "path";
import { getCacheDir, removeCacheEntry } from "./cacheDir";
import { getWorkspaces } from "workspace-tools";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export async function pruneCache(pruneDays: number, cwd: string, internalCacheFolder: string, logger: Logger) {
  const prunePeriod = pruneDays || 30;
  const now = new Date().getTime();
  const workspaces = getWorkspaces(cwd);
  for (const workspace of workspaces) {
    logger.info(`prune cache for ${workspace.name} older than ${prunePeriod} days`);
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);
    const logOutputCachePath = path.join(workspace.path, "node_modules/.cache/lage/output/");

    await Promise.all([prunePath(cachePath, prunePeriod, now), prunePath(logOutputCachePath, prunePeriod, now)]);
  }
}

async function prunePath(cachePath: string, days: number, now: number) {
  if (fs.existsSync(cachePath)) {
    const entries = fs.readdirSync(cachePath);

    for (const entry of entries) {
      const entryPath = path.join(cachePath, entry);
      const entryStat = await stat(entryPath);

      if (now - entryStat.mtime.getTime() > days * MS_IN_A_DAY) {
        await removeCacheEntry(entryPath, entryStat);
      }
    }
  }
}
