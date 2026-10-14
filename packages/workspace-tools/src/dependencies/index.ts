import { getTransitiveConsumers, getTransitiveProviders } from "./transitiveDeps.js";
import { getPackageDependencies } from "../graph/getPackageDependencies.js";
import type { PackageInfos } from "../types/PackageInfo.js";

// Some deprecated functions below for backwards compatibility

/**
 * Returns the direct and transitive dependencies of `targets` within `packages`, excluding the targets themselves.
 * For example, if `c` depends on `b` and `b` depends on `a`, the result for `["c"]` contains `b` and `a`.
 */
export function getTransitiveDependencies(targets: string[], packages: PackageInfos): string[] {
  return getTransitiveProviders(targets, packages);
}

export { getTransitiveProviders };

/**
 * Returns the direct and transitive dependents of `targets` within `packages`, excluding the targets themselves.
 * For example, if `c` depends on `b` and `b` depends on `a`, the result for `["a"]` contains `b` and `c`.
 */
export function getTransitiveDependents(targets: string[], packages: PackageInfos, scope?: string[]): string[] {
  return getTransitiveConsumers(targets, packages, scope);
}

export { getTransitiveConsumers };

/** @deprecated Do not use */
export const getInternalDeps = getPackageDependencies;
