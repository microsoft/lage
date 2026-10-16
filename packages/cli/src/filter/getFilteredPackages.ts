import type { ConfigOptions } from "@lage-run/config";
import type { TargetLogger } from "@lage-run/reporters";
import {
  getPackagesByFiles,
  getScopedPackages,
  getTransitiveDependencies,
  getTransitiveDependents,
  type PackageInfos,
} from "workspace-tools";
import type { FilterCliOptions } from "../commands/options.js";
import { getRepoChanges, type RepoChanges } from "./getRepoChanges.js";

export interface GetFilteredPackagesParams {
  root: string;
  packageInfos: PackageInfos;
  logger: TargetLogger;
  options: Pick<FilterCliOptions, "dependencies" | "dependents" | "ignore" | "scope" | "since" | "to">;
  config: Pick<ConfigOptions, "ignore" | "repoWideChanges">;
  /**
   * If `--since` is set, collect git changes even when scoped (`--scope`/`--to`).
   * This should be enabled for commands that support staged targets.
   */
  collectChangesForSince?: boolean;
}

/**
 * Shared package selection and change detection for `affected`, `run`, `info`, and the initial `--watch` run.
 * Combines CLI/config ignores and treats `--to` as `--scope` without dependents.
 */
export function getFilteredPackages(params: GetFilteredPackagesParams): {
  /** Selected package names, including requested dependencies and dependents. */
  packages: string[];
  /** Detection status and, on success, the unfiltered git change snapshot (does not respect ignores). */
  repoChanges: RepoChanges;
} {
  const { root, packageInfos, logger, options, config, collectChangesForSince = false } = params;
  const { since, dependencies: includeDependencies } = options;
  const to = options.to ?? [];
  const scope = (options.scope ?? []).concat(to);
  // Disable dependents if --to is specified
  const includeDependents = options.dependents && !to.length;
  // Explicit scope (including --to) takes precedence over --since, so selection alone needs no git changes.
  // Graph consumers can still request the snapshot for staged targets; detection is skipped without --since.
  const repoChanges: RepoChanges =
    scope.length && !collectChangesForSince
      ? { status: "skipped" }
      : getRepoChanges({ since, root, repoWideChanges: config.repoWideChanges, logger });

  let packages: string[];

  // If scope is defined, get scoped packages and return
  if (scope.length) {
    const scopedPackages = getScopedPackages(scope, packageInfos);
    return {
      repoChanges,
      packages: _filterPackages({ logger, packageInfos, scopedPackages, includeDependencies, includeDependents }),
    };
  }

  // If since is defined, get changed packages.
  if (since !== undefined) {
    let changedPackages: string[] | undefined;
    if (repoChanges.status === "success") {
      changedPackages = getPackagesByFiles({
        root,
        packageInfos,
        files: repoChanges.changedFiles,
        ignoreGlobs: options.ignore.concat(config.ignore),
        returnAllPackagesOnNoMatch: true,
      });
    }
    packages = _filterPackages({ logger, packageInfos, changedPackages, includeDependencies, includeDependents });

    // If repo-wide changes are detected, append all other packages to the filtered packages
    // to ensure that the modified packages are always run first.
    const repoWideChangedFiles = repoChanges.status === "success" ? repoChanges.repoWideChangedFiles : [];
    const repoChanged = !!repoWideChangedFiles.length;
    if (repoChanged) {
      logger.verbose(
        `Repo-wide changes detected, running all packages. The following changed packages and their deps (if specified) will be run first: ${packages.join(
          ","
        )}`
      );
      packages = [...new Set(packages.concat(Object.keys(packageInfos)))];
    }
    logger.silly(`Repo-wide changes detected: ${repoChanged}`, undefined, {
      event: "packageFiltering",
      since,
      repoChanged,
      repoWideChangedFiles,
      changedPackages,
      hasChanges: repoChanged || !!changedPackages?.length,
      fullBuild: repoChanged || changedPackages === undefined,
      packages,
    });
    return { packages, repoChanges };
  }

  // If neither scope or since is defined, return all packages
  return { packages: Object.keys(packageInfos), repoChanges };
}

export function _filterPackages(options: {
  logger: TargetLogger;
  packageInfos: PackageInfos;
  includeDependents: boolean;
  includeDependencies: boolean | undefined;
  scopedPackages?: string[];
  changedPackages?: string[];
}): string[] {
  const { scopedPackages, changedPackages, packageInfos, includeDependencies, includeDependents, logger } = options;

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
    logger.verbose(`filterPackages changed: ${filtered.join(",")}`);
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
