import type { TargetRun } from "./TargetRun.js";
import type { TargetStatus } from "./TargetStatus.js";

export type TargetRunSummary = Record<TargetStatus, string[]>;

export type SchedulerRunResults = "success" | "failed";

export interface SchedulerRunSummary<TTargetRunResult = unknown> {
  targetRunByStatus: TargetRunSummary;
  targetRuns: Map<string, TargetRun<TTargetRunResult>>;
  startTime: [number, number];
  duration: [number, number];
  results: SchedulerRunResults;
  error?: string;
  workerRestarts: number;
  maxWorkerMemoryUsage: number;
}
