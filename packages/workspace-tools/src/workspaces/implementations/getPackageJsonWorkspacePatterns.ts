import fs from "fs";
import path from "path";
import type { PackageInfo } from "../../types/PackageInfo.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

type PackageJsonWithWorkspaces = Pick<PackageInfo, "workspaces">;

/**
 * Default implementation of `WorkspaceUtilities.getWorkspacePatterns`:
 * read the `workspaces` field from package.json.
 *
 * Throws an error if the `workspaces` field is not found or invalid.
 * (Note that this is expected for single-package repos.)
 */
export const getPackageJsonWorkspacePatterns: WorkspaceUtilities["getWorkspacePatterns"] = ({ root }) => {
  const packageJsonFile = path.join(root, "package.json");

  let packageJson: PackageJsonWithWorkspaces;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf-8")) as PackageJsonWithWorkspaces;
  } catch {
    throw new Error(`Could not read or parse ${packageJsonFile}`);
  }

  const { workspaces } = packageJson;
  if (!workspaces) {
    throw new Error(`Could not find "workspaces" in ${packageJsonFile} (expected if this is not a monorepo)`);
  }

  const patterns = Array.isArray(workspaces) ? workspaces : workspaces?.packages;
  if (!patterns) {
    throw new Error(`"workspaces" in ${packageJsonFile} does not define "packages"`);
  }
  return { patterns, type: "pattern" };
};
