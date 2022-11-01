import type { Target } from "./types/Target.js";

export function getWeight(
  target: Target,
  weight: number | ((target: Target, maxWorkers?: number) => number) | undefined,
  maxWorkers?: number
): number {
  if (typeof weight === "number") {
    return weight;
  } else if (typeof weight === "function") {
    return weight(target, maxWorkers);
  }

  return 1;
}
