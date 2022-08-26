import { getCacheDir, removeCacheEntry } from "./cacheDir";
import { getWorkspaceRoot, getWorkspaces } from "workspace-tools";
import { Logger } from "@lage-run/logger";
import { stat } from "fs/promises";
import fs from "fs";
import path from "path";

export async function clearCache(cwd: string, internalCacheFolder: string, logger: Logger) {
  const workspaceRoot = getWorkspaceRoot(cwd);

  if (!workspaceRoot) {
    return;
  }

  const workspaces = getWorkspaces(workspaceRoot);

  for (const workspace of workspaces) {
    logger.info(`clear cache for ${workspace.name}`);
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);
    const logOutputCachePath = path.join(workspace.path, "node_modules/.cache/lage/output/");
    await Promise.all([clearPath(cachePath), clearPath(logOutputCachePath)]);
  }
}

async function clearPath(cachePath: string) {
  if (fs.existsSync(cachePath)) {
    const entries = fs.readdirSync(cachePath);

    for (const entry of entries) {
      const entryPath = path.join(cachePath, entry);
      const entryStat = await stat(entryPath);

      await removeCacheEntry(entryPath, entryStat);
    }
  }
}
