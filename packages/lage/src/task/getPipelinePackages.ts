import { Config } from "../types/Config";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import { getScopedPackages, getChangedPackages, getBranchChanges } from "workspace-tools";
import * as fg from "fast-glob";
import { logger } from "../logger";

export function getPipelinePackages(workspace: Workspace, config: Config) {
  const { scope, since, repoWideChanges, includeDependencies } = config;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, workspace.allPackages);
  }

  const hasSince = typeof since !== "undefined";
  let changedPackages: string[] | undefined = undefined;

  // Be specific with the changed packages only if no repo-wide changes occurred
  if (hasSince && !hasRepoChanged(since, workspace.root, repoWideChanges)) {
    try {
      changedPackages = getChangedPackages(workspace.root, since, config.ignore);
    } catch (e) {
      logger.warn(`An error in the git command has caused this scope run to include every package\n${e}`);
      // if getChangedPackages throws, we will assume all have changed (using changedPackage = undefined)
    }
  }

  return filterPackages({
    allPackages: workspace.allPackages,
    deps: config.deps,
    scopedPackages,
    changedPackages,
    includeDependencies,
  });
}

function hasRepoChanged(since: string, root: string, environmentGlob: string[]) {
  try {
    const changedFiles = getBranchChanges(since, root);
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
  } catch (e) {
    // if this fails, let's assume repo has changed
    logger.warn(`An error in the git command has caused this to consider the repo has changed\n${e}`);
    return true;
  }
}
