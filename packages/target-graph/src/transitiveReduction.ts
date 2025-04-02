import type { Target } from "./types/Target.js";

export function transitiveReduction(nodes: Target[]): Target[] {
  const nodeMap = new Map<string, Target>();
  const reachabilityCache = new Map<string, Map<string, boolean>>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    reachabilityCache.set(node.id, new Map());
    node.dependencies.forEach((dep) => {
      reachabilityCache.get(node.id)!.set(dep, true);
    });
  });

  function hasPath(start: string, end: string, visited: Set<string>): boolean {
    if (start === end) return true;
    if (visited.has(start)) return false;
    visited.add(start);
    if (reachabilityCache.get(start)?.has(end)) return reachabilityCache.get(start)!.get(end)!;
    const node = nodeMap.get(start);
    if (!node) return false;
    const isPathPresent = node.dependencies.some((dep) => hasPath(dep, end, visited));
    reachabilityCache.get(start)!.set(end, isPathPresent);
    return isPathPresent;
  }

  const reducedNodes = nodes.map((node) => ({
    ...node,
    dependencies: node.dependencies.filter((dep) => {
      const visited = new Set<string>();
      return !node.dependencies.some((otherDep) => otherDep !== dep && hasPath(otherDep, dep, visited));
    }),
  }));

  return reducedNodes;
}
