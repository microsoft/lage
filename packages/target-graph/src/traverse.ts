import type { Target } from "./types/Target.js";
import type { TargetGraph } from "./types/TargetGraph.js";

export function traverse(graph: TargetGraph, target: Target, visitor: (target: Target) => void): void {
  // iteratively traverse the graph starting from the target
  const visited = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (!visited.has(current.id)) {
      visited.add(current.id);
      visitor(current);
      for (const dep of current.dependencies) {
        stack.push(graph.targets.get(dep)!);
      }
    }
  }
}
