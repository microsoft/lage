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
 * Topologically sort the nodes in a graph in reverse order. Leaf nodes are at the beginning of the list and nodes with no dependencies are at the end of the list
 * @returns a list of ids in reverse topological order
 */
function reverseTopoSort(targets: Map<string, Target>, nodesWithNoDependencies: string[]): string[] {
  const sortedList: string[] = [];

  const dependsOnMap = getNewDependsOnMap(targets);
  const nodesWithNoDependenciesClone = [...nodesWithNoDependencies];

  while (nodesWithNoDependenciesClone.length > 0) {
    const currentId = nodesWithNoDependenciesClone.pop()!;

    sortedList.unshift(currentId);

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
 * Priorities for a target is actually the MAX of all the priorities of the targets that depend on it plus the current priority.
 */
export function prioritize(targets: Map<string, Target>): void {
  const nodeCumulativePriorities = new Map<string, number>();

  const nodesWithNoDependencies = getNodesWithNoDependencies(targets);
  const reverseTopoSortedNodeIds = reverseTopoSort(targets, nodesWithNoDependencies);

  /**
   * What is this loop doing?
   *
   * We want to make sure that all nodes with high priority are scheduled earlier. This means we need to make sure everything a node with high priority needs to ensure that all nodes it depends on has at least as high a priority set on them.
   * We go through all the nodes in reverse topological sort order, meaning we will visit a node before we visit any nodes it depends on. For each node, we will look at all the nodes that depend on the current task. All dependents will have
   * already been visited by the reverse topological sort so their priority is final. We will then take the maximum priority of all dependents and set the current nodes priority equal to the maximum priority plus the current node priority.
   */
  for (const currentNodeId of reverseTopoSortedNodeIds) {
    const node = targets.get(currentNodeId)!;
    // The default priority for a node is zero
    const currentNodePriority = node.priority || 0;

    // Let's find the dependent with the highest priority and make sure the current node has a priority at least as high as that
    const childrenPriorities = node.dependents.map((childId) => {
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
