import type { TargetGraph } from "@lage-run/target-graph";
import type { SchedulerRunSummary } from "./SchedulerRunSummary.js";

export interface TargetScheduler {
  abort(): void;
  run(root: string, targetGraph: TargetGraph, shouldRerun: boolean): Promise<SchedulerRunSummary>;
  onTargetChange?(targetId: string): void;
  cleanup(): void;
}
