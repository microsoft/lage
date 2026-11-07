import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";

export function createTarget(packageName: string, task: string): Target {
  return {
    id: `${packageName}#${task}`,
    cwd: `/repo/root/packages/${packageName}`,
    dependencies: [],
    dependents: [],
    depSpecs: [],
    packageName,
    task,
    label: `${packageName} - ${task}`,
  };
}

/**
 * Get a scheduler run summary (spread this and override properties as needed).
 * It will fill `targetRuns`, `targetRunByStatus`, and `results` based on `targetsByStatus`.
 */
export function createSummary(targetsByStatus: Partial<Record<TargetStatus, Target[]>>): SchedulerRunSummary {
  const targetRuns: SchedulerRunSummary["targetRuns"] = new Map();
  const targetRunByStatus: SchedulerRunSummary["targetRunByStatus"] = {
    pending: [],
    queued: [],
    running: [],
    success: [],
    failed: [],
    skipped: [],
    aborted: [],
  };

  for (const [_status, targets] of Object.entries(targetsByStatus)) {
    const status = _status as TargetStatus;
    for (const target of targets) {
      targetRuns.set(target.id, {
        target,
        status,
        duration: [60, 0],
        queueTime: [2, 0],
        startTime: [5, 0],
        threadId: 1,
      });
      targetRunByStatus[status].push(target.id);
    }
  }

  return {
    targetRunByStatus,
    targetRuns,
    startTime: [0, 0],
    duration: [100, 0],
    results: targetsByStatus.failed?.length ? "failed" : "success",
    workerRestarts: 0,
    maxWorkerMemoryUsage: 0,
  };
}
