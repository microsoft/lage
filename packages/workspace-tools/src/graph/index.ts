export * from "./createPackageGraph.js";
export * from "./createDependencyMap.js";
export * from "./getPackageDependencies.js";
import { type PackageInfos } from "../types/PackageInfo.js";
import { createDependencyMap } from "./createDependencyMap.js";

/**
 * @deprecated - use createDependencyMap() instead
 *
 * Gets a map that has the package name as key, and its dependencies as values
 */
export function getDependentMap(packages: PackageInfos): Map<string, Set<string>> {
  return createDependencyMap(packages).dependencies;
}
