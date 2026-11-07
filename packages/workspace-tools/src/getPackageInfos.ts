import { type PackageInfos } from "./types/PackageInfo.js";
import { getWorkspaceInfos, getWorkspaceInfosAsync } from "./workspaces/getWorkspaceInfos.js";
import { getPackageInfo } from "./getPackageInfo.js";
import type { WorkspacePackageInfo } from "./types/WorkspaceInfo.js";
import type { WorkspaceManager } from "./types/WorkspaceManager.js";
import { findPackageRoot } from "./paths.js";

/**
 * Read all the package.json files in a monorepo and return a mapping from package name to info.
 * Only works for monorepos which use a supported workspace/monorepo manager.
 *
 * Notes:
 * - The workspace manager, root, and list of package paths for `cwd` are cached internally,
 *   but the package contents are not.
 * - To get an array listing package names, paths, and contents, use `getWorkspaceInfos` instead.
 * - If no workspace config is found, it will return info for the root package.json if one exists.
 *   (This is different than `getWorkspaceInfos`.)
 *
 * @param cwd Start looking for the manager config from here
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Mapping from package name to package info.
 * If no workspace config is found, it will return info for the root package.json if one exists.
 * Will be empty on error (it logs verbose warnings instead of throwing).
 */
export function getPackageInfos(cwd: string, managerOverride?: WorkspaceManager): PackageInfos {
  const workspacePackages = getWorkspaceInfos(cwd, managerOverride);
  return buildPackageInfos({ cwd, workspacePackages });
}

/**
 * Read all the package.json files in a monorepo and return a mapping from package name to info.
 * Only works for monorepos which use a supported workspace/monorepo manager.
 *
 * Notes:
 * - **WARNING**: As of writing, this will start promises to read all package.json files in
 *   parallel, without direct concurrency control.
 * - The workspace manager, root, and list of package paths for `cwd` are cached internally,
 *   but the package contents are not.
 * - To get an array listing package names, paths, and contents, use `getWorkspaceInfos` instead.
 *
 * @param cwd Start looking for the manager config from here
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Mapping from package name to package info.
 * If no workspace config is found, it will return info for the root package.json if one exists.
 * Will be empty on error (it logs verbose warnings instead of throwing).
 */
export async function getPackageInfosAsync(cwd: string, managerOverride?: WorkspaceManager): Promise<PackageInfos> {
  const workspacePackages = await getWorkspaceInfosAsync(cwd, managerOverride);
  return buildPackageInfos({ cwd, workspacePackages });
}

/**
 * Convert an array of workspace package infos into a name-to-packageInfo map.
 * If there are no workspace packages, reads the root package.json instead.
 */
function buildPackageInfos(params: {
  cwd: string;
  workspacePackages: WorkspacePackageInfo[] | undefined;
}): PackageInfos {
  const { cwd, workspacePackages } = params;
  const packageInfos: PackageInfos = {};

  if (workspacePackages?.length) {
    for (const pkg of workspacePackages) {
      packageInfos[pkg.name] = pkg.packageJson;
    }
  } else {
    const packageRoot = findPackageRoot(cwd);
    const rootInfo = packageRoot && getPackageInfo(packageRoot);
    if (rootInfo) {
      packageInfos[rootInfo.name] = rootInfo;
    }
  }

  return packageInfos;
}
