import {
  getTransitiveConsumers,
  getTransitiveDependencies,
  PackageInfos,
} from "workspace-tools";
import { logger } from "../logger";

/**
 * Filters scopedPackages and changedPackages with option to calculate the transitive packages of all
 * @param options
 */
export function filterPackages(options: {
  allPackages: PackageInfos;
  deps: boolean;
  includeDependencies: boolean;
  scopedPackages: string[] | undefined;
  changedPackages: string[] | undefined;
}) {
  const {
    scopedPackages,
    changedPackages,
    allPackages,
    deps,
    includeDependencies,
  } = options;

  let filtered: string[] = [];

  // If scope is defined, use the transitive providers of the since packages up to the scope
  if (
    typeof scopedPackages !== "undefined" &&
    typeof changedPackages !== "undefined"
  ) {
    // If both scoped and since are specified, we have to merge two lists:
    // 1. changed packages that ARE themselves the scoped packages
    // 2. changed package consumers (package dependents) that are within the scoped subgraph
    filtered = changedPackages
      .filter((pkg) => scopedPackages.includes(pkg))
      .concat(
        getTransitiveConsumers(changedPackages, allPackages, scopedPackages)
      );

    logger.verbose(
      `filterPackages changed within scope: ${filtered.join(",")}`
    );
  } else if (typeof changedPackages !== "undefined") {
    filtered = [...changedPackages];
    logger.verbose(`filterPackages changed: ${changedPackages.join(",")}`);
  } else if (typeof scopedPackages !== "undefined") {
    filtered = [...scopedPackages];
    logger.verbose(`filterPackages scope: ${scopedPackages.join(",")}`);
  } else {
    filtered = Object.keys(allPackages);
  }

  // adds dependents (consumers) of all filtered package thus far
  if (deps) {
    logger.verbose(`filterPackages running with dependents`);
    filtered = filtered.concat(getTransitiveConsumers(filtered, allPackages));
  }

  // adds dependencies of all filtered package thus far
  if (includeDependencies) {
    filtered = filtered.concat(
      getTransitiveDependencies(filtered, allPackages)
    );
  }

  const unique = new Set(filtered);

  return [...unique];
}
