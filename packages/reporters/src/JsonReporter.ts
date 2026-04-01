/* eslint-disable no-console */

import { hrToSeconds } from "@lage-run/format-hrtime";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { LogLevel } from "@lage-run/logger";
import { type LogEntry, type Reporter } from "@lage-run/logger";
import type { TargetLogData } from "./types/TargetLogData.js";

interface JsonReporterTaskStats {
  package: string | undefined;
  task: string;
  duration: string;
  status: string;
}

/** Final entry logged by `JsonReporter.summarize()` */
export interface JsonReporterSummaryData {
  summary: {
    duration: string;
    taskStats: JsonReporterTaskStats[];
  } & {
    [status in `${TargetStatus}Targets`]?: number;
  };
}

/** `LogEntry.data` types for the `JsonReporter` */
export type JsonReporterLogData = JsonReporterSummaryData | TargetLogData;

export class JsonReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel; indented: boolean; logMemory?: boolean }) {}

  public log(entry: LogEntry<TargetLogData>): void {
    if (entry.data && entry.data.target && entry.data.target.hidden) {
      return;
    }

    if (this.options.logLevel >= entry.level) {
      console.log(this.options.indented ? JSON.stringify(entry, null, 2) : JSON.stringify(entry));
    }
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { duration, targetRuns, targetRunByStatus } = schedulerRunSummary;

    const summary: JsonReporterSummaryData["summary"] = {
      duration: hrToSeconds(duration),
      taskStats: [...targetRuns.values()].map((targetRun) => ({
        package: targetRun.target.packageName,
        task: targetRun.target.task,
        duration: hrToSeconds(targetRun.duration),
        status: targetRun.status,
      })),
    };

    for (const status of Object.keys(targetRunByStatus) as TargetStatus[]) {
      if (targetRunByStatus[status] && targetRunByStatus[status].length) {
        summary[`${status}Targets`] = targetRunByStatus[status].length;
      }
    }

    console.log(JSON.stringify({ summary }));
  }
}
