import type { Target } from "./types/Target.js";

export function transitiveReduction(nodes: Target[]): Target[] {
  const nodeMap = new Map<string, Target>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  function hasPath(start: string, end: string, visited: Set<string>): boolean {
    if (start === end) return true;
    if (visited.has(start)) return false;
    visited.add(start);
    const node = nodeMap.get(start);
    if (!node) return false;
    return node.dependencies.some((dep) => hasPath(dep, end, visited));
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
