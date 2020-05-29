import { Workspace } from "../types/Workspace";
import {
  getChangedPackages,
  findGitRoot,
  getPackageInfos,
} from "workspace-tools";
import { Config } from "../types/Config";
import { findNpmClient } from "../task/findNpmClient";

export function getWorkspace(cwd: string, config: Config): Workspace {
  const root = findGitRoot(cwd)!;
  if (!root) {
    throw new Error("This must be called inside a git-controlled repo");
  }

  const { since, ignore, npmClient } = config;
  const allPackages = getPackageInfos(root);
  const npmCmd = findNpmClient(npmClient);

  return {
    root,
    allPackages,
    changePackages: getChangedPackages(root, since, ignore),
    npmClient,
    npmCmd,
  };
}
