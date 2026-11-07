import type { LogStructuredData } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";

/** `LogEntry.data` for a target-related log */
export interface TargetData {
  target: Target;
}

/** `LogEntry.data` for a target status log */
export interface TargetStatusData extends TargetData {
  status: TargetStatus;
  duration?: [number, number];
  hash?: string;
  /**
   * Memory usage, only included for non-abort completion statuses and only if logging memory
   * usage is enabled in the reporter options.
   */
  memoryUsage?: NodeJS.MemoryUsage;
  threadId?: number;
}

/** `LogEntry.data` for a target error log */
export interface TargetErrorData extends TargetData {
  error: unknown;
}

/** `LogEntry.data` for any target log */
export type TargetLogData = TargetData | TargetStatusData | TargetErrorData;

/** `LogEntry.data` for any target or non-target log */
export type MaybeTargetLogData = TargetLogData | LogStructuredData;
