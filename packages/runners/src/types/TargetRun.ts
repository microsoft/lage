import type { Target } from "@lage-run/target-graph";
import type { TargetStatus } from "./TargetStatus.js";

export interface TargetRun<TResult = unknown> {
  queueTime: [number, number];
  startTime: [number, number];
  duration: [number, number];
  target: Target;
  status: TargetStatus;
  threadId: number;
  result?: TResult;
}
