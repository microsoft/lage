import type { TargetRunSummary } from "./types/SchedulerRunSummary";
import type { TargetRun } from "./types/TargetRun";

export function categorizeTargetRuns(targetRuns: TargetRun[]): TargetRunSummary {
  const summary: TargetRunSummary = {
    aborted: [],
    failed: [],
    skipped: [],
    success: [],
    running: [],
    pending: [],
  };

  for (const targetRun of targetRuns) {
    const { status } = targetRun;
    summary[status]!.push(targetRun.target.id);
  }

  return summary;
}
