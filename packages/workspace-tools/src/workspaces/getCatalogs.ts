import type { Catalogs } from "../types/Catalogs.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceUtilities } from "./implementations/index.js";
import { wrapWorkspaceUtility } from "./wrapWorkspaceUtility.js";

/**
 * Get version catalogs, if supported by the manager (only pnpm and yarn v4 as of writing).
 * Returns undefined if no catalogs are present or the manager doesn't support them.
 * @see https://pnpm.io/catalogs
 * @see https://yarnpkg.com/features/catalogs
 *
 * @param cwd - Current working directory. It will search up from here to find the root, with caching.
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Catalogs if defined, or undefined if not available
 * (logs verbose warnings instead of throwing on error)
 */
export function getCatalogs(cwd: string, managerOverride?: WorkspaceManager): Catalogs | undefined {
  return wrapWorkspaceUtility({
    cwd,
    managerOverride,
    description: "catalogs",
    impl: ({ manager, root }) => {
      // There is no default implementation for catalogs, since not all managers support it
      return getWorkspaceUtilities(manager).getCatalogs?.({ root });
    },
  });
}
