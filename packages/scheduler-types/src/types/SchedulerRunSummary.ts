import type { TargetRun } from "./TargetRun";
import type { TargetStatus } from "./TargetStatus";

// the "-?" syntax is TypeScript's way of making Mapped Types index signatures to always include a key
// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers
export type TargetRunSummary = { [key in TargetStatus]-?: string[] };

export type SchedulerRunResults = "success" | "failed";

export interface SchedulerRunSummary {
  targetRunByStatus: TargetRunSummary;
  targetRuns: Map<string, TargetRun>;
  startTime: [number, number];
  duration: [number, number];
  results: SchedulerRunResults;
  error?: string;
}
