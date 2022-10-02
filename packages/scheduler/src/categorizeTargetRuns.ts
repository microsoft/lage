import type { TargetRunSummary, TargetRun } from "@lage-run/scheduler-types";

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
    if (!targetRun.target.hidden) {
      summary[status]!.push(targetRun.target.id);
    }
  }

  return summary;
}
