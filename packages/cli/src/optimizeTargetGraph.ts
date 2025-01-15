import type { TargetRunnerPicker } from "@lage-run/runners";
import { type TargetGraph, removeNodes, transitiveReduction, getStartTargetId, type Target } from "@lage-run/target-graph";

export async function optimizeTargetGraph(graph: TargetGraph, runnerPicker: TargetRunnerPicker): Promise<Target[]> {
  const targetMinimizedNodes = await removeNodes([...graph.targets.values()], async (target) => {
    if (target.type === "noop") {
      return true;
    }

    if (target.id === getStartTargetId()) {
      return false;
    }

    const runner = await runnerPicker.pick(target);
    if (await runner.shouldRun(target)) {
      return false;
    }

    return true;
  });

  const reduced = transitiveReduction(targetMinimizedNodes);

  // Update the dependents of nodes based on the new set of dependencies
  // first build up a dependency map for quick lookup
  const dependencyMap = new Map<string, Set<string>>();
  for (const node of reduced) {
    for (const depId of node.dependencies) {
      if (!dependencyMap.has(depId)) {
        dependencyMap.set(depId, new Set<string>());
      }
      dependencyMap.get(depId)!.add(node.id);
    }
  }

  // update the dependents of each node
  for (const node of reduced) {
    const dependents = new Set<string>();
    if (dependencyMap.has(node.id)) {
      dependencyMap.get(node.id)!.forEach((dependentId) => dependents.add(dependentId));
    }

    node.dependents = Array.from(dependents);
  }

  return reduced;
}
