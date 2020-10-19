import { Workspace } from "../types/Workspace";
import {
  getChangedPackages,
  getWorkspaceRoot,
  getPackageInfos,
} from "workspace-tools";
import { Config } from "../types/Config";
import { findNpmClient } from "./findNpmClient";

export function getWorkspace(
  cwd: string,
  config: Pick<Config, "since" | "ignore" | "npmClient">
): Workspace {
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  const { since, ignore, npmClient } = config;
  const allPackages = getPackageInfos(root);
  const npmCmd = findNpmClient(npmClient);

  return {
    root,
    allPackages,
    changedPackages: getChangedPackages(root, since, ignore),
    npmClient,
    npmCmd,
  };
}
