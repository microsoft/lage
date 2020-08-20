import { Config } from "../types/Config";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import { getScopedPackages, getChangedPackages } from "workspace-tools";
import { getChanges } from "../git";
import * as fg from "fast-glob";

export function getPipelinePackages(workspace: Workspace, config: Config) {
  const { scope, since, environmentGlob } = config;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, workspace.allPackages);
  }

  const hasSince = typeof since !== "undefined";
  let changedPackages: string[] | undefined = undefined;

  // Be specific with the changed packages only if no repo-wide changes occurred
  if (hasSince && !hasRepoChanged(since, workspace.root, environmentGlob)) {
    changedPackages = getChangedPackages(workspace.root, since, config.ignore);
  }

  return filterPackages({
    allPackages: workspace.allPackages,
    deps: config.deps,
    scopedPackages,
    changedPackages,
  });
}

function hasRepoChanged(
  since: string,
  root: string,
  environmentGlob: string[]
) {
  const changedFiles = getChanges(since, root);
  const envFiles = fg.sync(environmentGlob, { cwd: root });
  let repoWideChanged = false;

  if (changedFiles) {
    for (const change of changedFiles) {
      if (envFiles.includes(change)) {
        repoWideChanged = true;
        break;
      }
    }
  }

  return repoWideChanged;
}
