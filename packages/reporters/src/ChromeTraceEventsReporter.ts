import { hrToSeconds } from "./formatDuration";
import type { SchedulerRunSummary, TargetRun } from "@lage-run/scheduler";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry";

interface TraceEventsObject {
  traceEvents: CompleteEvent[];
  displayTimeUnit: "ms" | "ns";
}

interface CompleteEvent {
  name: string;
  cat: string;
  ph: "X";
  ts: number; // in microseconds
  pid: number;
  tid: number;
  args: Record<string, any>;
}

export interface ChromeTraceEventsReporterOptions {
  outputFile: string;
  concurrency: number;
  categorize?: (targetRun: TargetRun) => string;
}

function range(len: number) {
  return Array(len)
    .fill(0)
    .map((_, idx) => idx);
}

export class ChromeTraceEventsReporter implements Reporter {
  constructor(private options: ChromeTraceEventsReporterOptions) {}

  log(_entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {}

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const threads = range(this.options.concurrency);
    const events: TraceEventsObject = {
      traceEvents: [],
      displayTimeUnit: "ms",
    };

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
