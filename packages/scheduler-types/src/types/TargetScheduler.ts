import type { TargetGraph } from "@lage-run/target-graph";
import type { SchedulerRunSummary } from "./SchedulerRunSummary";

export interface TargetScheduler {
  abort(): void;
  run(root: string, targetGraph: TargetGraph): Promise<SchedulerRunSummary>;
  onTargetChange?(targetId: string): void;
  cleanup(): void;
}
