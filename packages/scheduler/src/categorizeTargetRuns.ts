import type { TargetRunSummary, TargetRun } from "@lage-run/scheduler-types";

export function categorizeTargetRuns<T extends TargetRun>(targetRuns: IterableIterator<T>): TargetRunSummary {
  const summary: TargetRunSummary = {
    aborted: [],
    failed: [],
    skipped: [],
    success: [],
    running: [],
    pending: [],
    queued: [],
  };

  for (const targetRun of targetRuns) {
    const { status } = targetRun;
    if (!targetRun.target.hidden) {
      summary[status]!.push(targetRun.target.id);
    }
  }

  return summary;
}
