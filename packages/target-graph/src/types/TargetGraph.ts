import type { Target } from "../types/Target.js";

export interface TargetGraph {
  targets: Map<string, Target>;
}
