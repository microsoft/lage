import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceUtilities } from "./implementations/index.js";
import { wrapWorkspaceUtility } from "./wrapWorkspaceUtility.js";

/**
 * Get the original glob patterns from the manager's workspaces config.
 * (Calculation of the workspace manager and root for `cwd` is cached internally.)
 *
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Array of patterns, or undefined if not available
 * (logs verbose warnings instead of throwing on error)
 */
export function getWorkspacePatterns(cwd: string, managerOverride?: WorkspaceManager): string[] | undefined {
  return wrapWorkspaceUtility({
    cwd,
    managerOverride,
    description: "workspace patterns",
    impl: ({ manager, root }) => {
      const managerUtilities = getWorkspaceUtilities(manager);
      return managerUtilities.getWorkspacePatterns({ root })?.patterns;
    },
  });
}
