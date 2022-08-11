import type { TargetStatus } from "@lage-run/scheduler";
import type { Target } from "@lage-run/target-graph";

export interface TargetEntry {
  target: Target;
  status: TargetStatus;
  duration?: [number, number];
  hash?: string;
}
