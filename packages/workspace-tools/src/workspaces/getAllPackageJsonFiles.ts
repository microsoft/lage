import path from "path";
import { getWorkspacePackagePaths, getWorkspacePackagePathsAsync } from "./getWorkspacePackagePaths.js";
import { isCachingEnabled } from "../isCachingEnabled.js";

const cache = new Map<string, string[] | undefined>();

/**
 * Get paths to every package.json in the monorepo, given a cwd, with caching.
 *
 * @returns Array of package.json paths, or undefined if there's any issue
 * (logs verbose warnings instead of throwing on error)
 */
export function getAllPackageJsonFiles(cwd: string): string[] | undefined {
  if (isCachingEnabled() && cache.has(cwd)) {
    return cache.get(cwd)!;
  }

  const packageJsonFiles = getWorkspacePackagePaths(cwd)?.map((packagePath) => path.join(packagePath, "package.json"));

  cache.set(cwd, packageJsonFiles);

  return packageJsonFiles;
}

export function _resetPackageJsonFilesCache(): void {
  cache.clear();
}

/**
 * Get paths to every package.json in the monorepo, given a cwd, with caching.
 *
 * @returns Array of package.json paths, or undefined if there's any issue
 * (logs verbose warnings instead of throwing on error)
 */
export async function getAllPackageJsonFilesAsync(cwd: string): Promise<string[] | undefined> {
  if (isCachingEnabled() && cache.has(cwd)) {
    return cache.get(cwd)!;
  }

  const packageJsonFiles = (await getWorkspacePackagePathsAsync(cwd))?.map((packagePath) =>
    path.join(packagePath, "package.json")
  );

  cache.set(cwd, packageJsonFiles);

  return packageJsonFiles;
}
