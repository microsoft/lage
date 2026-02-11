import type { Target } from "./types/Target.js";

/**
 * Remove nodes from the graph that are not runnable.
 *
 * When a node is removed, dependencies on that node are replaced with dependencies on the node's own
 * dependencies.
 *
 * @param dag Node graph to process
 * @param shouldDelete Predicate function identifying nodes to remove
 */
export async function removeNodes(dag: Target[], shouldDelete: (node: Target) => boolean | Promise<boolean>): Promise<Target[]> {
  // Create a map for quick lookup of nodes by id
  const nodeMap = new Map<string, Target>();
  dag.forEach((node) => nodeMap.set(node.id, node));

  // Collect dependencies to be added to parents
  const additionalDependencies = new Map<string, Set<string>>();

  // Remove nodes that should be deleted and collect their dependencies
  for (const node of dag) {
    const doDelete = await shouldDelete(node);
    if (doDelete) {
      nodeMap.delete(node.id);
      for (const depId of node.dependencies) {
        if (!additionalDependencies.has(node.id)) {
          additionalDependencies.set(node.id, new Set<string>());
        }
        additionalDependencies.get(node.id)!.add(depId);
      }
    }
  }

  // Update dependencies of remaining nodes
  for (const node of nodeMap.values()) {
    const newDependencies = new Set<string>();

    // Inherit the dependencies of removed nodes we depended on
    const visitDependency = (depId: string) => {
      if (nodeMap.has(depId)) {
        // It's still a valid node, keep in dependencies list
        newDependencies.add(depId);
      } else {
        // Node was removed, propagate dependencies from the removed node
        additionalDependencies.get(depId)?.forEach(visitDependency);
      }
    };
    node.dependencies.forEach(visitDependency);
    node.dependencies = Array.from(newDependencies);
  }

  // Convert the map back to an array
  return Array.from(nodeMap.values());
}
