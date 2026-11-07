import { type PackageInfos } from "../types/PackageInfo.js";
import { getPackageDependencies } from "../graph/getPackageDependencies.js";
import { isCachingEnabled } from "../isCachingEnabled.js";

const graphCache = new Map<string, [string | null, string][]>();

function memoizedKey(packages: PackageInfos, scope: string[] = []) {
  return JSON.stringify({ packages, scope });
}

function getPackageGraph(packages: PackageInfos, scope: string[] = []) {
  const internalPackages = new Set(Object.keys(packages));
  const key = memoizedKey(packages, scope);

  if (isCachingEnabled() && graphCache.has(key)) {
    return graphCache.get(key)!;
  }

  const edges: [string | null, string][] = [];

  const visited = new Set<string>();
  const stack: string[] = scope.length > 0 ? [...scope] : Object.keys(packages);

  while (stack.length > 0) {
    const pkg = stack.pop()!;

    if (visited.has(pkg)) {
      continue;
    }

    visited.add(pkg);

    const info = packages[pkg];
    const deps = getPackageDependencies(info, internalPackages);

    if (deps.length > 0) {
      for (const dep of deps) {
        stack.push(dep);
        edges.push([dep, pkg]);
      }
    } else {
      edges.push([null, pkg]);
    }
  }

  graphCache.set(key, edges);

  return edges;
}

export function getDependentMap(packages: PackageInfos): Map<string, Set<string>> {
  const graph = getPackageGraph(packages);
  const map = new Map<string, Set<string>>();
  for (const [from, to] of graph) {
    if (!map.has(to)) {
      map.set(to, new Set());
    }

    if (from) {
      map.get(to)!.add(from);
    }
  }

  return map;
}

/**
 * Returns the direct and transitive dependents of `targets` within `packages`, excluding the targets themselves.
 * For example, if `c` depends on `b` and `b` depends on `a`, the result for `["a"]` contains `b` and `c`.
 *
 * @deprecated Use `getTransitiveDependents` instead.
 */
export function getTransitiveConsumers(targets: string[], packages: PackageInfos, scope: string[] = []): string[] {
  const graph = getPackageGraph(packages, scope);
  const pkgQueue: string[] = [...targets];
  const visited = new Set<string>();

  while (pkgQueue.length > 0) {
    const pkg = pkgQueue.shift()!;

    if (!visited.has(pkg)) {
      visited.add(pkg);

      for (const [from, to] of graph) {
        if (from === pkg) {
          pkgQueue.push(to);
        }
      }
    }
  }

  return [...visited].filter((pkg) => !targets.includes(pkg));
}

/**
 * Returns the direct and transitive dependencies of `targets` within `packages`, excluding the targets themselves.
 * For example, if `c` depends on `b` and `b` depends on `a`, the result for `["c"]` contains `b` and `a`.
 *
 * @deprecated Use `getTransitiveDependencies` instead.
 */
export function getTransitiveProviders(targets: string[], packages: PackageInfos): string[] {
  const graph = getPackageGraph(packages);
  const pkgQueue: string[] = [...targets];
  const visited = new Set<string>();

  while (pkgQueue.length > 0) {
    const pkg = pkgQueue.shift()!;

    if (!visited.has(pkg)) {
      visited.add(pkg);

      for (const [from, to] of graph) {
        if (to === pkg && from) {
          pkgQueue.push(from);
        }
      }
    }
  }

  return [...visited].filter((pkg) => !targets.includes(pkg));
}
