import type { Target } from "@lage-run/target-graph";
import type { TargetStatus } from "./TargetStatus";

export interface TargetRun {
  startTime: [number, number];
  duration: [number, number];
  target: Target;
  status: TargetStatus;
}
