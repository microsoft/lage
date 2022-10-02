import { getStartTargetId } from "@lage-run/target-graph";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetRun } from "@lage-run/scheduler-types";
import type { TargetStatusEntry, TargetMessageEntry } from './types/TargetLogEntry';
import type { Writable } from "stream";

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
  outputFile?: string;
  concurrency: number;
  categorize?: (targetRun?: TargetRun) => string;
}

function range(len: number) {
  return Array(len)
    .fill(0)
    .map((_, idx) => idx + 1);
}

function hrTimeToMicroseconds(hr: [number, number]) {
  return hr[0] * 1e6 + hr[1] * 1e-3;
}

function getTimeBasedFilename(prefix: string) {
  const now = new Date(); // 2011-10-05T14:48:00.000Z
  const datetime = now.toISOString().split(".")[0]; // 2011-10-05T14:48:00
  const datetimeNormalized = datetime.replace(/-|:/g, ""); // 20111005T144800
  return `${prefix ? prefix + "-" : ""}${datetimeNormalized}.json`;
}

export class ChromeTraceEventsReporter implements Reporter {
  logStream: Writable;
  consoleLogStream: Writable = process.stdout;

  private threads: number[];
  private targetIdThreadMap: Map<string, number> = new Map();
  private events: TraceEventsObject = {
    traceEvents: [],
    displayTimeUnit: "ms",
  };
  private outputFile: string;

  constructor(private options: ChromeTraceEventsReporterOptions) {
    this.outputFile = options.outputFile ?? getTimeBasedFilename("profile");
    this.threads = range(options.concurrency);

    if (!fs.existsSync(path.dirname(this.outputFile))) {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    }

    this.logStream = fs.createWriteStream(this.outputFile, { flags: "w" });
  }

  log(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data;
    if (isTargetStatusLogEntry(data) && data.status !== "pending" && data.target.id !== getStartTargetId()) {
      if (data.status === "running") {
        const threadId = this.threads.shift() ?? 0;
        this.targetIdThreadMap.set(data.target.id, threadId);
      } else {
        const threadId = this.targetIdThreadMap.get(data.target.id)!;

        this.events.traceEvents.push({
          name: data.target.id,
          cat: "", // to be filled in later in the "summary" step
          ph: "X",
          ts: 0, // to be filled in later in the "summary" step
          dur: hrTimeToMicroseconds(data.duration ?? [0, 1000]), // in microseconds
          pid: 1,
          tid: threadId ?? 0,
        });

        this.threads.unshift(threadId);
        this.threads.sort((a, b) => a - b);
      }
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const { targetRuns, startTime } = schedulerRunSummary;

    // categorize events
    const { categorize } = this.options;

    for (const event of this.events.traceEvents) {
      const targetRun = targetRuns.get(event.name)!;

      event.ts = hrTimeToMicroseconds(targetRun.startTime) - hrTimeToMicroseconds(startTime);
      event.cat = targetRun?.status ?? "";
      if (categorize) {
        event.cat += `,${categorize(targetRun)}`;
      }
    }

    // write events to stream
    this.logStream.write(JSON.stringify(this.events, null, 2));

    this.consoleLogStream.write(
      chalk.blueBright(
        `\nProfiler output written to ${chalk.underline(this.outputFile)}, open it with chrome://tracing or edge://tracing\n`
      )
    );
  }
}
