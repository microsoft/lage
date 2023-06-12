import type { TargetGraph } from "@lage-run/target-graph";
import type { SchedulerRunSummary } from "./SchedulerRunSummary.js";

export interface TargetScheduler<TRunResult = unknown> {
  abort(): void;
  run(root: string, targetGraph: TargetGraph, shouldRerun: boolean): Promise<SchedulerRunSummary<TRunResult>>;
  onTargetChange?(targetId: string): void;
  cleanup(): void;
}
