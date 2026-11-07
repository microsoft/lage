import micromatch from "micromatch";
import path from "path";
import { getWorkspaceInfos } from "./getWorkspaceInfos.js";
import type { PackageInfos } from "../types/PackageInfo.js";

interface GetPackagesByFilesOptions {
  /** Monorepo root directory */
  root: string;
  /** Files to search for */
  files: string[];
  /** Already loaded package metadata to use instead of discovering workspaces */
  packageInfos?: PackageInfos;
  /** Glob patterns to ignore */
  ignoreGlobs?: string[];
  /** If true, will return all packages if any non-ignored file does not match a package */
  returnAllPackagesOnNoMatch?: boolean;
}

/**
 * Given a list of files, finds all packages names that contain those files
 *
 * @returns Package names that have changed
 */
export function getPackagesByFiles(options: GetPackagesByFilesOptions): string[];
/** @deprecated Use object parameter signature instead */
export function getPackagesByFiles(
  root: string,
  files: string[],
  ignoreGlobs?: string[],
  returnAllPackagesOnNoMatch?: boolean
): string[];
export function getPackagesByFiles(
  cwdOrOptions: string | GetPackagesByFilesOptions,
  files?: string[],
  ignoreGlobs?: string[],
  returnAllPackagesOnNoMatch?: boolean
): string[] {
  let root: string;
  let packageInfos: PackageInfos | undefined;
  if (typeof cwdOrOptions === "string") {
    root = cwdOrOptions;
    files = files!;
  } else {
    ({ root, files, packageInfos, ignoreGlobs, returnAllPackagesOnNoMatch } = cwdOrOptions);
  }

  const workspaces = packageInfos
    ? Object.entries(packageInfos).map(([name, info]) => ({ name, path: path.dirname(info.packageJsonPath) }))
    : getWorkspaceInfos(root) || [];
  const ignoreSet = new Set(ignoreGlobs?.length ? micromatch(files, ignoreGlobs) : []);

  const filteredFiles = files.filter((change) => !ignoreSet.has(change));

  const packages = new Set<string>();

  for (const file of filteredFiles) {
    const candidates = workspaces.filter((pkg) => file.startsWith(path.relative(root, pkg.path).replace(/\\/g, "/")));

    if (candidates.length) {
      const found = candidates.reduce((fnd, item) => (fnd.path.length > item.path.length ? fnd : item), candidates[0]);
      packages.add(found.name);
    } else if (returnAllPackagesOnNoMatch) {
      return workspaces.map((pkg) => pkg.name);
    }
  }

  return [...packages];
}
