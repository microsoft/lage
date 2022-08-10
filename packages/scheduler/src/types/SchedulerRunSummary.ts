import type { TargetRunContext, TargetStatus } from "@lage-run/scheduler";

export type TargetRunContextSummary = { [key in TargetStatus]: TargetRunContext[] | undefined };

export interface SchedulerRunSummary extends TargetRunContextSummary {
  duration: [number, number];
}
