import { getPackageInfo, getPackageInfoAsync } from "../getPackageInfo.js";
import type { WorkspaceInfos, WorkspacePackageInfo } from "../types/WorkspaceInfo.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspacePackagePaths, getWorkspacePackagePathsAsync } from "./getWorkspacePackagePaths.js";
import { wrapAsyncWorkspaceUtility, wrapWorkspaceUtility } from "./wrapWorkspaceUtility.js";

/**
 * Get an array with names, paths, and package.json contents for each package ("workspace" in
 * npm/yarn/pnpm terms) within a monorepo. The list of included packages is based on the
 * workspace/monorepo manager's config file.
 *
 * Notes:
 * - The workspace manager, root, and list of package paths for `cwd` are cached internally,
 *   but the package contents are not.
 * - To get an object with package names as keys, use `getPackageInfos` instead.
 *
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Array of workspace package infos, or undefined if not found (not a monorepo)
 * or there's any issue. (Logs verbose warnings instead of throwing on error.)
 */
export function getWorkspaceInfos(cwd: string, managerOverride?: WorkspaceManager): WorkspaceInfos | undefined {
  return wrapWorkspaceUtility({
    cwd,
    managerOverride,
    description: "workspace package infos",
    impl: ({ manager }) => {
      return getWorkspacePackagePaths(cwd, manager)
        ?.map<WorkspacePackageInfo | undefined>((packagePath) => {
          // getPackageInfo logs a warning if it can't be read
          const packageJson = getPackageInfo(packagePath);
          return packageJson && { name: packageJson.name, path: packagePath, packageJson };
        })
        .filter(Boolean) as WorkspaceInfos | undefined;
    },
  });
}

/**
 * Get an array with names, paths, and package.json contents for each package ("workspace" in
 * npm/yarn/pnpm terms) within a monorepo. The list of included packages is based on the
 * workspace/monorepo manager's config file.
 *
 * Notes:
 * - **WARNING**: As of writing, this will start promises to read all package.json files in
 *   parallel, without direct concurrency control.
 * - The workspace manager, root, and list of package paths for `cwd` are cached internally,
 *   but the package contents are not.
 * - To get an object with package names as keys, use `getPackageInfosAsync` instead.
 *
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Array of workspace package infos, or undefined if not found (not a monorepo)
 * or there's any issue. (Logs verbose warnings instead of throwing on error.)
 */
export async function getWorkspaceInfosAsync(
  cwd: string,
  managerOverride?: WorkspaceManager
): Promise<WorkspaceInfos | undefined> {
  return wrapAsyncWorkspaceUtility({
    cwd,
    managerOverride,
    description: "workspace package infos",
    impl: async ({ manager }) => {
      const packagePaths = await getWorkspacePackagePathsAsync(cwd, manager);
      if (!packagePaths) return undefined;

      const workspacePkgPromises = packagePaths.map<Promise<WorkspacePackageInfo | undefined>>(async (packagePath) => {
        // getPackageInfoAsync logs a warning if it can't be read
        const packageJson = await getPackageInfoAsync(packagePath);
        return packageJson && { name: packageJson.name, path: packagePath, packageJson };
      });

      return (await Promise.all(workspacePkgPromises)).filter(Boolean) as WorkspaceInfos;
    },
  });
}
