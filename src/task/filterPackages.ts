import {
  getTransitiveDependencies,
  getScopedPackages,
  getChangedPackages,
  PackageInfos,
} from "workspace-tools";

import { logger } from "../logger";

export function filterPackages(options: {
  root: string;
  allPackages: PackageInfos;
  deps: boolean;
  scope?: string[];
  since?: string;
  ignore?: string[];
}) {
  const { since, scope, allPackages, deps, root, ignore } = options;

  let filtered: string[] = [];

  let hasScopes = Array.isArray(scope) && scope.length > 0;
  let hasSince = typeof since !== "undefined";

  // If NOTHING is specified, use all packages
  if (!hasScopes && !hasSince) {
    logger.verbose("filterPackages", "scope: all packages");
    filtered = Object.keys(allPackages);
  }

  // If scoped is defined, get scoped packages
  if (hasScopes) {
    const scoped = getScopedPackages(scope!, allPackages);
    filtered = filtered.concat(scoped);
    logger.verbose("filterPackages", `scope: ${scoped.join(",")}`);
  }

  if (hasSince) {
    const changedPackages = getChangedPackages(root, since, ignore);
    filtered = filtered.concat(changedPackages);
    logger.verbose("filterPackages", `changed: ${changedPackages.join(",")}`);
  }

  if (deps) {
    filtered = filtered.concat(
      getTransitiveDependencies(filtered, allPackages)
    );
  }

  const unique = new Set(filtered);

  return [...unique];
}
