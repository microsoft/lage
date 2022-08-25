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
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);

    if (fs.existsSync(cachePath)) {
      logger.info(`clearing cache for ${workspace.name}`);
      const entries = fs.readdirSync(cachePath);

      for (const entry of entries) {
        const entryPath = path.join(cachePath, entry);
        const entryStat = await stat(entryPath);

        await removeCacheEntry(entryPath, entryStat);
      }
    }
  }
}
