import type { Target } from "./types/Target";

export function sortTargetsByPriority(targets: Target[]) {
  return targets.sort((a, b) => {
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}
