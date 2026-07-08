import type { PackageInfos } from "workspace-tools";
import {
  getScopedPackages,
  getChangedPackages,
  getTransitiveDependents,
  getTransitiveDependencies,
  getBranchChanges,
} from "workspace-tools";

import type { ExperimentalLockfileInvalidationOptions } from "@lage-run/lockfile";
import { getLockfileName } from "@lage-run/lockfile";
import type { TargetLogger } from "@lage-run/reporters";
import { hasRepoChanged } from "./hasRepoChanged.js";
import { getLockfileChangedPackages } from "./getLockfileChangedPackages.js";

export function getFilteredPackages(options: {
  root: string;
  packageInfos: PackageInfos;
  logger: TargetLogger;
  scope: string[] | undefined;
  since: string | undefined;
  sinceIgnoreGlobs: string[] | undefined;
  repoWideChanges: string[];
  includeDependents: boolean;
  includeDependencies: boolean;
  experimentalLockfileInvalidation?: ExperimentalLockfileInvalidationOptions;
}): string[] {
  const {
    scope,
    since,
    sinceIgnoreGlobs,
    repoWideChanges,
    includeDependents,
    includeDependencies,
    logger,
    packageInfos,
    root,
    experimentalLockfileInvalidation,
  } = options;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  let filteredPackages: string[] | undefined = undefined;
  let changedPackages: string[] | undefined = undefined;
  const hasSince = typeof since !== "undefined";

  // If scope is defined, get scoped packages and return
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, packageInfos);
    // return filteredPackages;
    return filterPackages({
      logger,
      packageInfos,
      scopedPackages,
      changedPackages,
      includeDependencies,
      includeDependents,
    });
  }
  // If since is defined, get changed packages.
  else if (hasSince) {
    // When experimental lockfile invalidation is enabled, analyze the lockfile change (if any) so
    // that the lockfile does not trigger a blanket invalidation. On any analysis failure, we keep
    // the previous blanket behavior so builds never silently under-invalidate.
    let lockfileAffectedPackages: string[] | undefined;
    let effectiveIgnoreGlobs = sinceIgnoreGlobs;
    let effectiveRepoWideChanges = repoWideChanges;

    if (experimentalLockfileInvalidation) {
      const lockfileName = getLockfileName(experimentalLockfileInvalidation);
      let changedFiles: string[] = [];
      try {
        changedFiles = getBranchChanges({ branch: since!, cwd: root });
      } catch (e) {
        logger.warn(`Experimental lockfile invalidation could not determine changed files; using blanket behavior\n${e}`);
      }

      const lockfileResult = getLockfileChangedPackages({
        root,
        since: since!,
        changedFiles,
        packageInfos,
        experimentalLockfileInvalidation,
        logger,
      });

      if (lockfileResult.status === "affected") {
        lockfileAffectedPackages = [...lockfileResult.packages];
        // The feature now owns lockfile handling: prevent the lockfile from triggering the blanket
        // "all packages" behavior in both the changed-packages and repo-wide-changes paths.
        effectiveIgnoreGlobs = [...(sinceIgnoreGlobs ?? []), lockfileName];
        effectiveRepoWideChanges = repoWideChanges.filter((glob) => glob !== lockfileName);
      } else if (lockfileResult.status === "fallback") {
        logger.warn(
          `Experimental lockfile invalidation could not analyze the lockfile change (${lockfileResult.reason}); falling back to blanket invalidation.`
        );
      }
      // "unchanged": nothing to do; the lockfile is not among the changed files.
    }

    try {
      changedPackages = getChangedPackages({
        cwd: root,
        target: since,
        ignoreGlobs: effectiveIgnoreGlobs,
      });
    } catch (e) {
      logger.warn(`An error in the git command has caused this scope run to include every package\n${e}`);
      // if getChangedPackages throws, we will assume all have changed (using changedPackage = undefined)
    }

    // Merge in packages whose dependency closure changed due to the lockfile.
    if (lockfileAffectedPackages !== undefined && changedPackages !== undefined) {
      changedPackages = [...new Set([...changedPackages, ...lockfileAffectedPackages])];
    }

    filteredPackages = filterPackages({
      logger,
      packageInfos,
      scopedPackages,
      changedPackages,
      includeDependencies,
      includeDependents,
    });

    // If the defined repo-wide changes are detected the get all packages and append to the filtered packages.
    // This alo ensures that the modified packages are always run first.
    if (hasRepoChanged({ since, root, environmentGlob: effectiveRepoWideChanges, logger })) {
      logger.verbose(
        `Repo-wide changes detected, running all packages. The following changed packages and their deps (if specified) will be run first: ${filteredPackages.join(
          ","
        )}`
      );
      filteredPackages = [...new Set(filteredPackages.concat(Object.keys(packageInfos)))];
    }
    return filteredPackages;
  } else {
    // If neither scope or since is defined, return all packages
    return Object.keys(packageInfos);
  }
}

export function filterPackages(options: {
  logger: TargetLogger;
  packageInfos: PackageInfos;
  includeDependents: boolean;
  includeDependencies: boolean;
  scopedPackages: string[] | undefined;
  changedPackages: string[] | undefined;
}): string[] {
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
    logger.verbose(`filterPackages running with dependencies`);
    filtered = filtered.concat(getTransitiveDependencies(filtered, packageInfos));
  }

  const unique = new Set(filtered);

  return [...unique];
}
