import path from "path";

/**
 * Get the root cache directory: `<root>/node_modules/.cache/lage`
 */
export function getCacheDirectoryRoot(root: string): string {
  return path.join(root, "node_modules", ".cache", "lage");
}

/**
 * Get the cache subdirectory for a hash: `<root>/node_modules/.cache/lage/cache/ab12`
 * for a hash that starts with `ab12`
 */
export function getCacheDirectory(root: string, hash: string): string {
  return path.join(getHashCacheDirectories(root).cache, hash.substring(0, 4));
}

/**
 * Get the logs subdirectory for a hash: `<root>/node_modules/.cache/lage/logs/ab12`
 * for a hash that starts with `ab12`
 */
export function getLogsCacheDirectory(root: string, hash: string): string {
  return path.join(getHashCacheDirectories(root).logs, hash.substring(0, 4));
}

/**
 * Get the parent `cache` and `logs` directories that contain subfolders with hash prefixes.
 */
export function getHashCacheDirectories(root: string): {
  /** `<root>/node_modules/.cache/lage/cache` */
  cache: string;
  /** `<root>/node_modules/.cache/lage/logs` */
  logs: string;
} {
  return {
    cache: path.join(getCacheDirectoryRoot(root), "cache"),
    logs: path.join(getCacheDirectoryRoot(root), "logs"),
  };
}
