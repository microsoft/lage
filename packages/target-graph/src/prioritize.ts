import type { Target } from "./types/Target.js";

function getNodesWithNoDependencies(targets: Map<string, Target>) {
  const nodesWithNoDependencies: string[] = [];

  for (const [id, target] of targets) {
    if (target.dependencies.length === 0) {
      nodesWithNoDependencies.push(id);
    }
  }

  return nodesWithNoDependencies;
}

/** Creates a map of node ids to a set of all the nodes this node depends on. This creates a new copy of the set to enable duplication */
function getNewDependsOnMap(pGraphDependencyMap: Map<string, Target>): Map<string, Set<string>> {
  return new Map([...pGraphDependencyMap.entries()].map(([key, value]) => [key, new Set(value.dependencies)]));
}

/**
 * Topologically sort the nodes in a graph - starting with nodes with no dependencies
 * @returns a list of ids in order
 */
function topologicalSort(targets: Map<string, Target>, nodesWithNoDependencies: string[]): string[] {
  const sortedList: string[] = [];

  const dependsOnMap = getNewDependsOnMap(targets);
  const nodesWithNoDependenciesClone = [...nodesWithNoDependencies];

  while (nodesWithNoDependenciesClone.length > 0) {
    const currentId = nodesWithNoDependenciesClone.pop()!;

    sortedList.push(currentId);

    const node = targets.get(currentId)!;

    // Update the depends on maps of all outgoing edges
    node.dependents.forEach((childId) => {
      const childNode = dependsOnMap.get(childId)!;
      childNode.delete(currentId);

      // If this item is now unblocked, put it on the unblocked list
      if (childNode.size === 0) {
        nodesWithNoDependenciesClone.push(childId);
      }
    });
  }

  return sortedList;
}

/**
 * Priorities for a target is actually the MAX of all the priorities of the targets that depend on it.
 */
export function prioritize(targets: Map<string, Target>) {
  const nodeCumulativePriorities = new Map<string, number>();

  const nodesWithNoDependencies = getNodesWithNoDependencies(targets);
  const topoSortedNodeIds = topologicalSort(targets, nodesWithNoDependencies);

  /**
   * What is this loop doing?
   *
   * Now that we have topologically sorted the nodes, we examine the each node
   * and update the cumulative priority of all the nodes that depend on it.
   */
  for (const currentNodeId of topoSortedNodeIds) {
    const node = targets.get(currentNodeId)!;
    // The default priority for a node is zero
    const currentNodePriority = node.priority || 0;

    const childrenPriorities = node.dependencies.map((childId) => {
      const childCumulativePriority = nodeCumulativePriorities.get(childId);
      if (childCumulativePriority === undefined) {
        throw new Error(`Expected to have already computed the cumulative priority for node ${childId}`);
      }

      return childCumulativePriority;
    });

    const maxChildCumulativePriority = Math.max(...childrenPriorities, 0);

    const result = currentNodePriority + maxChildCumulativePriority;

    nodeCumulativePriorities.set(currentNodeId, result);
  }

  // Set the priority of each node to the cumulative priority
  for (const target of targets.values()) {
    const cumulativePriority = nodeCumulativePriorities.get(target.id);
    if (cumulativePriority === undefined) {
      throw new Error(`Expected to have already computed the cumulative priority for node ${target.id}`);
    }

    target.priority = cumulativePriority;
  }
}
