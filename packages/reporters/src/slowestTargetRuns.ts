import { hrtimeDiff, hrToSeconds } from "@lage-run/format-hrtime";
import type { TargetRun } from "@lage-run/scheduler-types";

export function slowestTargetRuns(targetRuns: TargetRun[]) {
  return targetRuns
    .sort((a, b) => parseFloat(hrToSeconds(hrtimeDiff(a.duration, b.duration))))
    .filter((run) => run.status !== "skipped" && !run.target.hidden);
}
