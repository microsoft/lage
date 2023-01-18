import path from "path";

export function getCacheDir(workspace: string, internalCacheFolder: string) {
  const cacheFolder = !internalCacheFolder ? undefined : internalCacheFolder;
  return path.join(workspace, cacheFolder ?? "node_modules/.cache/backfill");
}
