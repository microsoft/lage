import type { Target } from "./types/Target.js";

export function sortTargetsByPriority(targets: Target[]) {
  return targets.sort((a, b) => {
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}
