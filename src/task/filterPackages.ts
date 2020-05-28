import logger from "npmlog";
import { RunContext } from "../types/RunContext";
import { getScopedPackages, getTransitiveDependencies } from "workspace-tools";

export function filterPackages(context: RunContext) {
  const { allPackages, scope, since, deps, changedPackages } = context;

  let scopes = ([] as string[]).concat(scope);

  let filtered: string[] = [];
  let hasScopes = scopes && scopes.length > 0;
  let hasSince = typeof since !== "undefined";

  // If NOTHING is specified, use all packages
  if (!hasScopes && !hasSince) {
    logger.verbose("filterPackages", "scope: all packages");
    filtered = Object.keys(allPackages);
  }

  // If scoped is defined, get scoped packages
  if (hasScopes) {
    const scoped = getScopedPackages(scopes, allPackages);
    filtered = filtered.concat(scoped);
    logger.verbose("filterPackages", `scope: ${scoped.join(",")}`);
  }

  if (hasSince) {
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
