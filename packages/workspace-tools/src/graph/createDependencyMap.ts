import { getPackageDependencies, type PackageDependenciesOptions } from "./getPackageDependencies.js";
import type { PackageInfos } from "../types/PackageInfo.js";

export interface DependencyMap {
  /** Mapping from package names to their dependencies */
  dependencies: Map<string, Set<string>>;
  /** Mapping from package names to their dependents */
  dependents: Map<string, Set<string>>;
}

/**
 * Creates a dependency map for the packages in a monorepo.
 *
 * @param packages - Information about all packages in the monorepo
 * @param options - Which dependency types to include. `dependencies` are always included, and it
 * defaults to also including `devDependencies`.
 * @returns A map of package dependencies and dependents
 */
export function createDependencyMap(
  packages: PackageInfos,
  options: PackageDependenciesOptions = { withDevDependencies: true, withPeerDependencies: false }
): DependencyMap {
  const map: DependencyMap = {
    dependencies: new Map(),
    dependents: new Map(),
  };

  const internalPackages = new Set(Object.keys(packages));

  for (const [pkg, info] of Object.entries(packages)) {
    const deps = getPackageDependencies(info, internalPackages, options);
    for (const dep of deps) {
      if (!map.dependencies.has(pkg)) {
        map.dependencies.set(pkg, new Set());
      }
      map.dependencies.get(pkg)!.add(dep);

      if (!map.dependents.has(dep)) {
        map.dependents.set(dep, new Set());
      }
      map.dependents.get(dep)!.add(pkg);
    }
  }
  return map;
}
