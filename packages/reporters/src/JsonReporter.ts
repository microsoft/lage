/* eslint-disable no-console */

import { hrToSeconds } from "./formatDuration";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { LogEntry, LogLevel, Reporter } from "@lage-run/logger";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry";

export class JsonReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel }) {}

  log(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    if (entry.data && entry.data.target && entry.data.target.hidden) {
      return;
    }

    if (this.options.logLevel >= entry.level) {
      console.log(JSON.stringify(entry));
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const { duration, targetRuns, targetRunByStatus } = schedulerRunSummary;
    const summary: any = {};
    const taskStats: any[] = [];

    for (const targetRun of targetRuns.values()) {
      taskStats.push({
        package: targetRun.target.packageName,
        task: targetRun.target.task,
        duration: hrToSeconds(targetRun.duration),
        status: targetRun.status,
      });
    }

    for (const status of Object.keys(targetRunByStatus)) {
      if (targetRunByStatus[status] && targetRunByStatus[status].length.length > 0) {
        summary[`${status}Targets`] = targetRunByStatus[status].length;
      }
    }

    summary.duration = hrToSeconds(duration);
    summary.taskStats = taskStats;

    console.log(JSON.stringify({ summary }));
  }
}
