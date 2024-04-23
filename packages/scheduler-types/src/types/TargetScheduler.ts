import type { TargetGraph } from "@lage-run/target-graph";
import type { SchedulerRunSummary } from "./SchedulerRunSummary.js";

export interface TargetScheduler<TTargetRunResult> {
  abort(): void;
  run(root: string, targetGraph: TargetGraph, shouldRerun: boolean): Promise<SchedulerRunSummary<TTargetRunResult>>;
  onTargetChange?(targetId: string): void;
  cleanup(): void;
}
