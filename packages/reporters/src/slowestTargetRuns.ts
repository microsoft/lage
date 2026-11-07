import { hrtimeDiff, hrToSeconds } from "./formatDuration.js";
import type { TargetRun } from "@lage-run/scheduler-types";

/**
 * Sort the target runs by duration, with skipped and hidden targets removed.
 */
export function slowestTargetRuns(targetRuns: TargetRun[]): TargetRun<unknown>[] {
  return targetRuns
    .filter((run) => run.status !== "skipped" && !run.target.hidden)
    .sort((a, b) => parseFloat(hrToSeconds(hrtimeDiff(a.duration, b.duration))));
}
