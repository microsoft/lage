import type { TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";

/** `LogEntry.data` for a target status log */
export interface TargetStatusData {
  target: Target;
  status: TargetStatus;
  duration?: [number, number];
  hash?: string;
}

/** `LogEntry.data` for a target message log */
export interface TargetMessageData {
  target: Target;
  pid: number;
}

/** `LogEntry.data` for any target log */
export type TargetLogData = TargetStatusData | TargetMessageData;
