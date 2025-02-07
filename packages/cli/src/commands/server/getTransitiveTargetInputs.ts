import { type PackageTree, getInputFiles } from "@lage-run/hasher";
import { type Target, type TargetGraph, getStartTargetId } from "@lage-run/target-graph";
import type { DependencyMap } from "workspace-tools";

export function getTransitiveTargetInputs(
  target: Target,
  targetGraph: TargetGraph,
  dependencyMap: DependencyMap,
  packageTree: PackageTree
) {
  const inputsSet = new Set<string>(getInputFiles(target, dependencyMap, packageTree) ?? []);

  // iteratively add all transitive dependencies in a breath-first manner using a queue
  const queue = target.dependencies.slice();
  const visited = new Set<string>();
  while (queue.length > 0) {
    const dependency = queue.shift()!;
    if (dependency === getStartTargetId()) {
      continue;
    }

    // skip if already visited
    if (visited.has(dependency)) {
      continue;
    }
    visited.add(dependency);

    // now add the inputs of the dependency
    const depTarget = targetGraph.targets.get(dependency)!;
    const depInputs = getInputFiles(depTarget, dependencyMap, packageTree);
    if (depInputs) {
      depInputs.forEach((file) => inputsSet.add(file));
    }

    // add the dependencies of the dependency to the queue
    queue.push(...depTarget.dependencies);
  }

  return Array.from(inputsSet);
}
