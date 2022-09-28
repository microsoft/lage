import type { Target } from "../types/Target";

export interface TargetGraph {
  targets: Map<string, Target>;
  dependencies: [string, string][];
}
