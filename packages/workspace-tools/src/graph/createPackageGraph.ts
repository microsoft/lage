import micromatch from "micromatch";
import type { PackageGraph } from "../types/PackageGraph.js";
import type { PackageInfos } from "../types/PackageInfo.js";
import type { DependencyMap } from "./createDependencyMap.js";
import { createDependencyMap } from "./createDependencyMap.js";
import type { PackageDependenciesOptions } from "./getPackageDependencies.js";

/**
 * Reference: https://github.com/pnpm/pnpm/blob/597047fc056dd25b83638a9ab3df0df1c555ee49/packages/filter-workspace-packages/src/parsePackageSelector.ts
 */
export interface PackageGraphFilter extends PackageDependenciesOptions {
  namePatterns: string[];
  includeDependencies?: boolean;
  includeDependents?: boolean;
}

/** Package graph visitor is called as it visits every package in dependency order */
interface PackageGraphVisitor {
  (pkg: string, dependencies: string[], dependents: string[]): void;
}

/**
 * Create a package graph for the given packages, optionally filtered by the provided filters.
 */
export function createPackageGraph(
  packages: PackageInfos,
  filters?: PackageGraphFilter[] | PackageGraphFilter
): PackageGraph {
  /** Set of packages being accumulated as the graph is filtered */
  const packageSet = new Set<string>();

  /** Array of package names & its dependencies being accumulated as the graph is filtered */
  const edges: PackageGraph["dependencies"] = [];

  const edgeKeys: Set<string> = new Set();
  const dependencyMapCache = new Map<string, DependencyMap>();

  function visitorForFilter(
    filter: PackageGraphFilter | undefined,
    pkg: string,
    dependencies: string[],
    dependents: string[]
  ) {
    packageSet.add(pkg);

    if (!filter || (filter.includeDependencies && dependencies)) {
      for (const dep of dependencies) {
        const key = edgeKey(pkg, dep);

        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ name: pkg, dependency: dep });
        }

        packageSet.add(dep);
      }
    }

    if (!filter || (filter.includeDependents && dependents)) {
      for (const dep of dependents) {
        const key = edgeKey(dep, pkg);

        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ name: dep, dependency: pkg });
        }

        packageSet.add(dep);
      }
    }
  }

  if (filters) {
    filters = Array.isArray(filters) ? filters : [filters];
    for (const filter of filters) {
      const visitor = visitorForFilter.bind(undefined, filter);
      const dependencyMap = getDependencyMapForFilter(packages, filter);
      visitPackageGraph(packages, dependencyMap, visitor, filter);
    }
  } else {
    const visitor = visitorForFilter.bind(undefined, undefined);
    const dependencyMap = getDependencyMapForFilter(packages);
    visitPackageGraph(packages, dependencyMap, visitor);
  }

  return { packages: [...packageSet], dependencies: edges };

  /** Calculates a key for checking if an edge is already added */
  function edgeKey(name: string, dependency: string) {
    return `${name}->${dependency}`;
  }

  /** Gets the dependencyMap for a filter, using a cache based on filter options */
  function getDependencyMapForFilter(pkgs: PackageInfos, filter?: PackageGraphFilter) {
    const cacheKey = getCacheKeyForFilter(filter);
    if (!dependencyMapCache.has(cacheKey)) {
      const dependencyMap = createDependencyMap(pkgs, filter);
      dependencyMapCache.set(cacheKey, dependencyMap);
    }
    return dependencyMapCache.get(cacheKey)!;
  }

  /** Generates a cache key based on the filter options */
  function getCacheKeyForFilter(filter?: PackageGraphFilter): string {
    if (!filter) {
      return "default";
    }
    const options = [
      filter.withDevDependencies ? "dev" : "",
      filter.withPeerDependencies ? "peer" : "",
      filter.withOptionalDependencies ? "optional" : "",
    ]
      .filter(Boolean)
      .join("_");
    return options || "prod";
  }
}

function visitPackageGraph(
  packages: PackageInfos,
  dependencyMap: DependencyMap,
  visitor: PackageGraphVisitor,
  filter?: PackageGraphFilter
) {
  const visited = new Set<string>();
  const packageNames = Object.keys(packages);

  const stack: string[] = filter ? micromatch(packageNames, filter.namePatterns) : packageNames;

  while (stack.length > 0) {
    const pkg = stack.pop()!;

    if (visited.has(pkg)) {
      continue;
    }

    const nextPkgs: Set<string> = new Set();
    let dependencies: string[] = [];
    let dependents: string[] = [];

    if (!filter || filter.includeDependencies) {
      dependencies = [...(dependencyMap.dependencies.get(pkg) ?? [])];
      for (const dep of dependencies) {
        nextPkgs.add(dep);
      }
    }

    if (!filter || filter.includeDependents) {
      dependents = [...(dependencyMap.dependents.get(pkg) ?? [])];
      for (const dep of dependents) {
        nextPkgs.add(dep);
      }
    }

    visitor(pkg, dependencies, dependents);

    visited.add(pkg);

    if (nextPkgs.size > 0) {
      for (const nextPkg of nextPkgs) {
        stack.push(nextPkg);
      }
    }
  }
}
