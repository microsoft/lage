import { getTransitiveConsumers, PackageInfos } from "workspace-tools";
import { logger } from "../logger";

/**
 * Filters scopedPackages and changedPackages with option to calculate the transitive packages of all
 * @param options
 */
export function filterPackages(options: {
  allPackages: PackageInfos;
  deps: boolean;
  scopedPackages: string[] | undefined;
  changedPackages: string[] | undefined;
}) {
  const { scopedPackages, changedPackages, allPackages, deps } = options;

  let filtered = Object.keys(allPackages);

  // If scoped is defined, get scoped packages
  if (typeof scopedPackages !== "undefined") {
    filtered = filtered.filter((pkg) => scopedPackages.includes(pkg));
    logger.verbose(`filterPackages scope: ${scopedPackages.join(",")}`);
  }

  if (typeof changedPackages !== "undefined") {
    filtered = filtered.filter((pkg) => changedPackages.includes(pkg));
    logger.verbose(`filterPackages changed: ${changedPackages.join(",")}`);
  }

  if (deps) {
    filtered = filtered.concat(getTransitiveConsumers(filtered, allPackages));
  }

  const unique = new Set(filtered);

  return [...unique];
}
