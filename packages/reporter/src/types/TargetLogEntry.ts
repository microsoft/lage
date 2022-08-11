import type { TargetStatus } from "@lage-run/scheduler";
import type { Target } from "@lage-run/target-graph";

export interface TargetStatusEntry {
  target: Target;
  status: TargetStatus;
  duration?: [number, number];
  hash?: string;
}

export interface TargetMessageEntry {
  target: Target;
  pid: number;
}
