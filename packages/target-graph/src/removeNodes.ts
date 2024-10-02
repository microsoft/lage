import type { Target } from "./types/Target.js";

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
    const newDependencies = new Set(node.dependencies);
    for (const depId of node.dependencies) {
      if (additionalDependencies.has(depId)) {
        additionalDependencies.get(depId)!.forEach((subDepId) => newDependencies.add(subDepId));
      }
    }
    node.dependencies = Array.from(newDependencies).filter((depId) => nodeMap.has(depId));
  }

  // Convert the map back to an array
  return Array.from(nodeMap.values());
}
