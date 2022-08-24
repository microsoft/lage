import fs from "fs";
import path from "path";
import { rm, unlink } from "fs/promises";

export function getCacheDir(workspace: string, internalCacheFolder: string) {
  const cacheFolder = !internalCacheFolder ? undefined : internalCacheFolder;
  return path.join(workspace, cacheFolder ?? "node_modules/.cache/backfill");
}

export async function removeCacheEntry(entryPath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    rm(entryPath, { recursive: true });
  } else {
    unlink(entryPath);
  }
}
