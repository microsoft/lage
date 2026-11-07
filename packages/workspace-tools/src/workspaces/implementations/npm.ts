import { getPackageJsonWorkspacePatterns } from "./getPackageJsonWorkspacePatterns.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

/** npm has no overrides of the default behaviors */
export const npmUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: getPackageJsonWorkspacePatterns,
};
