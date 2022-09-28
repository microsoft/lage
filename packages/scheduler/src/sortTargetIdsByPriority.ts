import type { Target } from "@lage-run/target-graph";

export function sortTargetIdsByPriority(targets: Target[]) {
  return targets
    .sort((a, b) => {
      return (b.priority ?? 0) - (a.priority ?? 0);
    })
    .map((t) => t.id);
}
