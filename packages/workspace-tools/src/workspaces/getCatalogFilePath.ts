import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceUtilities } from "./implementations/index.js";
import { wrapWorkspaceUtility } from "./wrapWorkspaceUtility.js";

/**
 * Get the path to the file that contains catalog definitions for the detected workspace manager.
 * Returns undefined if the manager doesn't support catalogs, the manager can't be detected,
 * or the catalog file doesn't exist.
 *
 * @param cwd - Current working directory. It will search up from here to find the root.
 * @param managerOverride - Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Absolute path to the catalog file, or undefined if not available
 */
export function getCatalogFilePath(cwd: string, managerOverride?: WorkspaceManager): string | undefined {
  return wrapWorkspaceUtility({
    cwd,
    managerOverride,
    description: "catalog file path",
    impl: ({ manager, root }) => {
      return getWorkspaceUtilities(manager).getCatalogFilePath?.({ root });
    },
  });
}
