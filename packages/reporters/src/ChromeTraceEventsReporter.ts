import chalk from "chalk";
import fs from "fs";
import path from "path";
import type { Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetRun } from "@lage-run/scheduler-types";
import type { Writable } from "stream";

interface TraceEventsObject {
  traceEvents: CompleteEvent[];
  displayTimeUnit: "ms" | "ns";
}

interface CompleteEvent {
  name: string;
  cat: string; // status#task
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
  private consoleLogStream: Writable;

  private events: TraceEventsObject = {
    traceEvents: [],
    displayTimeUnit: "ms",
  };
  private outputFile: string;

  constructor(
    private options: ChromeTraceEventsReporterOptions & {
      /** stream for testing */
      consoleLogStream?: Writable;
    }
  ) {
    this.outputFile = options.outputFile ?? getTimeBasedFilename("profile");
    this.consoleLogStream = options.consoleLogStream ?? process.stdout;
  }

  public log(): void {
    // pass
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { targetRuns, startTime } = schedulerRunSummary;

    // categorize events
    const { categorize } = this.options;

    for (const targetRun of targetRuns.values()) {
      // Skip hidden targets because those should be hidden by reporters.
      // Hiding as well skipped targets to avoid polluting the profile.
      if (targetRun.target.hidden || targetRun.status === "skipped") {
        continue;
      }

      const event = {
        name: targetRun.target.id,
        cat: `${targetRun.status}#${targetRun.target.task}`,
        ph: "X",
        ts: hrTimeToMicroseconds(targetRun.startTime) - hrTimeToMicroseconds(startTime), // in microseconds
        dur: hrTimeToMicroseconds(targetRun.duration ?? [0, 1000]), // in microseconds
        pid: 1,
        tid: targetRun.threadId,
      } as CompleteEvent;

      if (categorize) {
        event.cat += `,${categorize(targetRun)}`;
      }

      this.events.traceEvents.push(event);
    }

    if (!fs.existsSync(path.dirname(this.outputFile))) {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    }

    fs.writeFileSync(this.outputFile, JSON.stringify(this.events, null, 2));

    this.consoleLogStream.write(
      chalk.blueBright(
        `\nProfiler output written to ${chalk.underline(this.outputFile)}, open it with chrome://tracing or edge://tracing\n`
      )
    );
  }
}
