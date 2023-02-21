import path from "path";

export function getCacheDirectoryRoot(root: string) {
  return path.join(root, "node_modules", ".cache", "lage");
}

export function getCacheDirectory(root: string, hash: string) {
  return path.join(getCacheDirectoryRoot(root), "cache", hash.substring(0, 4));
}

export function getLogsCacheDirectory(root: string, hash: string) {
  return path.join(getCacheDirectoryRoot(root), "logs", hash.substring(0, 4));
}
