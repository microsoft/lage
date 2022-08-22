import {
  getScopedPackages,
  getChangedPackages,
  getBranchChanges,
  PackageInfos,
  getTransitiveDependents,
  getTransitiveDependencies,
} from "workspace-tools";
import * as fg from "fast-glob";
import { Logger } from "@lage-run/logger";

export function getFilteredPackages(options: {
  root: string;
  packageInfos: PackageInfos;
  logger: Logger;
  scope: string[] | undefined;
  since: string | undefined;
  repoWideChanges: string[];
  includeDependents: boolean;
  includeDependencies: boolean;
}) {
  const { scope, since, repoWideChanges, includeDependents, includeDependencies, logger, packageInfos, root } = options;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, packageInfos);
  }

  const hasSince = typeof since !== "undefined";
  let changedPackages: string[] | undefined = undefined;

  // Be specific with the changed packages only if no repo-wide changes occurred
  if (hasSince && !hasRepoChanged(since, root, repoWideChanges, logger)) {
    try {
      changedPackages = getChangedPackages(root, since);
    } catch (e) {
      logger.warn(`An error in the git command has caused this scope run to include every package\n${e}`);
      // if getChangedPackages throws, we will assume all have changed (using changedPackage = undefined)
    }
  }

  return filterPackages({
    logger,
    packageInfos,
    scopedPackages,
    changedPackages,
    includeDependencies,
    includeDependents,
  });
}

function hasRepoChanged(since: string, root: string, environmentGlob: string[], logger: Logger) {
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

export function filterPackages(options: {
  logger: Logger;
  packageInfos: PackageInfos;
  includeDependents: boolean;
  includeDependencies: boolean;
  scopedPackages: string[] | undefined;
  changedPackages: string[] | undefined;
}) {
  const { scopedPackages, changedPackages, packageInfos, includeDependents, includeDependencies, logger } = options;

  let filtered: string[] = [];

  // If scope is defined, use the transitive providers of the since packages up to the scope
  if (typeof scopedPackages !== "undefined" && typeof changedPackages !== "undefined") {
    // If both scoped and since are specified, we have to merge two lists:
    // 1. changed packages that ARE themselves the scoped packages
    // 2. changed package consumers (package dependents) that are within the scoped subgraph
    filtered = changedPackages
      .filter((pkg) => scopedPackages.includes(pkg))
      .concat(getTransitiveDependents(changedPackages, packageInfos, scopedPackages));

    logger.verbose(`filterPackages changed within scope: ${filtered.join(",")}`);
  } else if (typeof changedPackages !== "undefined") {
    filtered = [...changedPackages];
    logger.verbose(`filterPackages changed: ${changedPackages.join(",")}`);
  } else if (typeof scopedPackages !== "undefined") {
    filtered = [...scopedPackages];
    logger.verbose(`filterPackages scope: ${scopedPackages.join(",")}`);
  } else {
    filtered = Object.keys(packageInfos);
  }

  // adds dependents (consumers) of all filtered package thus far
  if (includeDependents) {
    logger.verbose(`filterPackages running with dependents`);
    filtered = filtered.concat(getTransitiveDependents(filtered, packageInfos));
  }

  // adds dependencies of all filtered package thus far
  if (includeDependencies) {
    filtered = filtered.concat(getTransitiveDependencies(filtered, packageInfos));
  }

  const unique = new Set(filtered);

  return [...unique];
}
