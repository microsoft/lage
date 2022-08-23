import type { SchedulerRunSummary, TargetRun } from "@lage-run/scheduler";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry";
import fs from "fs";
import { getStartTargetId } from "@lage-run/target-graph";

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
  dur: number;
  args?: Record<string, any>;
}

export interface ChromeTraceEventsReporterOptions {
  outputFile: string;
  concurrency: number;
  categorize?: (targetRun?: TargetRun) => string;
}

function range(len: number) {
  return Array(len)
    .fill(0)
    .map((_, idx) => idx);
}

function hrTimeToMicroseconds(hr: [number, number]) {
  return hr[0] * 1e6 + hr[1] * 1e-3;
}
export class ChromeTraceEventsReporter implements Reporter {
  private threads: number[];
  private targetIdThreadMap: Map<string, number> = new Map();
  private events: TraceEventsObject = {
    traceEvents: [],
    displayTimeUnit: "ms",
  };

  constructor(private options: ChromeTraceEventsReporterOptions) {
    this.threads = range(options.concurrency);
  }

  log(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data;
    if (isTargetStatusLogEntry(data) && data.status !== "pending" && data.target.id !== getStartTargetId()) {
      if (data.status === "running") {
        const threadId = this.threads.shift() ?? 0;
        this.targetIdThreadMap.set(data.target.id, threadId);
      } else {
        const threadId = this.targetIdThreadMap.get(data.target.id);
        this.events.traceEvents.push({
          name: data.target.id,
          cat: "",
          ph: "X",
          ts: entry.timestamp * 1000, // in microseconds
          dur: hrTimeToMicroseconds(data.duration ?? [0, 0]), // in microseconds
          pid: 1,
          tid: threadId ?? 0,
        });

        this.threads.unshift(threadId ?? 0);
      }
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const { targetRuns } = schedulerRunSummary;

    // categorize events
    const { categorize } = this.options;

    if (categorize) {
      for (const event of this.events.traceEvents) {
        const targetRun = targetRuns.get(event.name);
        event.cat = `${categorize(targetRun)},${targetRun?.status}`;
      }
    }

    // write events to file
    fs.writeFileSync(this.options.outputFile ?? "profile.cpuprofile", JSON.stringify(this.events, null, 2));
  }
}
