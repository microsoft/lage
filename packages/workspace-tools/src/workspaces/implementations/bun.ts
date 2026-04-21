import { getPackageJsonWorkspacePatterns } from "./getPackageJsonWorkspacePatterns.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

/**
 * Bun uses the standard package.json "workspaces" field.
 */
export const bunUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: getPackageJsonWorkspacePatterns,
};
