import { Workspace } from "../types/Workspace";
import { getWorkspaceRoot, getPackageInfos } from "workspace-tools";
import { Config } from "../types/Config";

export function getWorkspace(cwd: string, config: Pick<Config, "since" | "ignore" | "npmClient">): Workspace {
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  const { npmClient } = config;
  const allPackages = getPackageInfos(root);

  return {
    root,
    allPackages,
    npmClient,
  };
}
