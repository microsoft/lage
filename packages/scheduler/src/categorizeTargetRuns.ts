import type { TargetRunSummary } from "./types/SchedulerRunSummary";
import type { TargetRunContext } from "./types/TargetRunContext";

export function categorizeTargetRuns(targetRuns: TargetRunContext[]): TargetRunSummary {
  const summary: TargetRunSummary = {
    aborted: [],
    failed: [],
    skipped: [],
    success: [],
    running: [],
    pending: [],
  };

  for (const wrappedTarget of targetRuns) {
    const { status } = wrappedTarget;
    summary[status]!.push(wrappedTarget);
  }

  return summary;  
}