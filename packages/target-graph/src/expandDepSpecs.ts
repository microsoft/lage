import type { Target } from "./types/Target";
import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import { getPackageAndTask, getStartTargetId, getTargetId } from "./targetId";

/**
 * Expands the dependency graph by adding all transitive dependencies of the given targets.
 */
export function expandDepSpecs(targets: Map<string, Target>, dependencyMap: DependencyMap) {
  const dependencies: [string, string][] = [];

  /**
   * Adds a dependency in the form of [from, to] to the dependency list.
   * @param from
   * @param to
   */
  const addDependency = (from: string, to: string) => {
    dependencies.push([from, to]);
  };

  /**
   * Finds all transitive dependencies, given a task and optionally a dependency list.
   * @param task
   * @param dependencies
   * @returns
   */
  const findDependenciesByTask = (task: string, dependencies?: string[]) => {
    if (!dependencies) {
      return targetList.filter((needle) => needle.task === task).map((needle) => needle.id);
    }

    return targetList
      .filter((needle) => {
        const { task: needleTask, packageName: needlePackageName } = needle;
        return needleTask === task && dependencies.some((depPkg) => depPkg === needlePackageName);
      })
      .map((needle) => needle.id);
  };

  const targetList = [...targets.values()];

  for (const target of targetList) {
    const { depSpecs, packageName, id: to } = target;

    // Always start with a root node with a special "START_TARGET_ID"
    // because any node could potentially be part of the entry point in building the scoped target subgraph
    dependencies.push([getStartTargetId(), to]);

    // Skip any targets that have no "deps" specified
    if (!depSpecs || depSpecs.length === 0) {
      continue;
    }

    /**
     * Now for every deps defined, we need to "interpret" it based on the syntax:
     * - for any deps like package#task, we simply add the singular dependency (source could be a single package or all packages)
     * - for anything that starts with a "^", we add the package-tasks according to the topological package graph
     *    NOTE: in a non-strict mode (TODO), the dependencies can come from transitive task dependencies
     * - for anything that starts with a "^^", we add the package-tasks from the transitive dependencies in the topological
     *    package graph.
     * - for {"pkgA#task": ["dep"]}, we interpret to add "pkgA#dep"
     * - for anything that is a string without a "^", we treat that string as the name of a task, adding all targets that way
     *    NOTE: in a non-strict mode (TODO), the dependencies can come from transitive task dependencies
     *
     * We interpret anything outside of these conditions as invalid
     */
    for (const dependencyTargetId of depSpecs) {
      if (dependencyTargetId.includes("#")) {
        // id's with a # are package-task dependencies, or global
        // therefore, we must use getPackageAndTask() & getTargetId() to normalize the target id
        // (e.g. "build": ["build-tool#build"])
        const { packageName, task } = getPackageAndTask(dependencyTargetId);
        const normalizedDependencyTargetId = getTargetId(packageName, task);
        addDependency(normalizedDependencyTargetId, to);
      } else if (dependencyTargetId.startsWith("^^") && packageName) {
        // Transitive depdency (e.g. bundle: ['^^transpile'])
        const depTask = dependencyTargetId.substring(2);
        const targetDependencies = [...(getTransitiveGraphDependencies(packageName, dependencyMap) ?? [])];
        const dependencyTargetIds = findDependenciesByTask(depTask, targetDependencies);
        for (const from of dependencyTargetIds) {
          addDependency(from, to);
        }
      } else if (dependencyTargetId.startsWith("^") && packageName) {
        // Topological dependency (e.g. build: ['^build'])
        const depTask = dependencyTargetId.substring(1);
        const targetDependencies = [...(dependencyMap.dependencies.get(packageName) ?? [])];
        const dependencyTargetIds = findDependenciesByTask(depTask, targetDependencies);
        for (const from of dependencyTargetIds) {
          addDependency(from, to);
        }
      } else if (packageName) {
        // Add dependency on a specific package and given task name as dependency
        // (e.g. bundle: ['build'])
        const task = dependencyTargetId;
        if (targets.has(getTargetId(packageName, task))) {
          addDependency(getTargetId(packageName, task), to);
        }
      } else if (!dependencyTargetId.startsWith("^")) {
        // Global dependency - add all targets that match task name as dependency
        // (e.g. "#bundle": ['build'])
        const task = dependencyTargetId;
        const dependencyIds = findDependenciesByTask(task);
        for (const dependencyId of dependencyIds) {
          addDependency(dependencyId, to);
        }
      } else {
        throw new Error(`invalid pipeline config detected: ${target.id}, packageName: ${packageName}, dep: ${dependencyTargetId}`);
      }
    }
  }

  return dependencies;
}

/** Cached transitive task dependency */
let cachedTransitiveTaskDependencies: Map<string, "walk-in-progress" | Set<string>> = new Map();

/**
 * Gets a list of package names that are direct or indirect dependencies of rootPackageName in this.graph,
 * and caches them on the Pipeline.
 *
 * For example, this is useful for a bundling target that depends on all transitive dependencies to have been built.
 *
 * @param packageName the root package to begin walking from
 */
function getTransitiveGraphDependencies(packageName: string, dependencyMap: DependencyMap): Set<string> {
  const cachedResult = cachedTransitiveTaskDependencies.get(packageName);
  if (cachedResult) {
    return cachedResult === "walk-in-progress"
      ? // There is a recursive walk over this set of dependencies in progress.
        // If we hit this case, that means that a dependency of this package depends on it.
        //
        // In this case we return an empty set to omit this package and it's downstream from its
        // dependency
        new Set()
      : // we already computed this for this package, return the cached result.
        cachedResult;
  } else {
    // No cached result. Compute now with a recursive walk

    // mark that we are traversing this package to prevent infinite recursion
    // in cases of circular dependencies
    cachedTransitiveTaskDependencies.set(packageName, "walk-in-progress");

    const immediateDependencies = [...(dependencyMap.dependencies.get(packageName) ?? [])];

    // build the set of transitive dependencies by recursively walking the
    // immediate dependencies' dependencies.
    const transitiveDepSet = new Set<string>(immediateDependencies);
    for (const immediateDependency of immediateDependencies) {
      for (const transitiveSubDependency of getTransitiveGraphDependencies(immediateDependency, dependencyMap)) {
        transitiveDepSet.add(transitiveSubDependency);
      }
    }

    // Cache the result and return
    cachedTransitiveTaskDependencies.set(packageName, transitiveDepSet);
    return transitiveDepSet;
  }
}
