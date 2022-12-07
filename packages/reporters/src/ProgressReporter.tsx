import { ProgressReporterApp } from "./components/ProgressReporterApp";
import { render } from "ink";
import * as React from "react";
import EventEmitter from "events";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";

export class ProgressReporter implements Reporter {
  timer: NodeJS.Timeout;
  startTime: [number, number] = [0, 0];

  logEvent: EventEmitter = new EventEmitter();
  logEntries = new Map<string, LogEntry[]>();

  constructor(options: { concurrency: number } = { concurrency: 0 }) {
    render(<ProgressReporterApp logEvent={this.logEvent} concurrency={options.concurrency} />);
    this.timer = setTimeout(this.heartBeat, 1000);
  }

  heartBeat = () => {
    this.logEvent.emit("heartbeat", {
      currentTime: process.hrtime(this.startTime),
    });

    this.timer = setTimeout(this.heartBeat, 1000);
  }

  log(entry: LogEntry<any>) {
    // save the logs for errors
    if (entry.data?.target?.id) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }
      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    // if "hidden", do not even attempt to record or report the entry
    if (entry?.data?.target?.hidden) {
      return;
    }

    if (entry.data && entry.data.schedulerRun) {
      this.startTime = entry.data.schedulerRun.startTime;
    }

    if (entry.data && entry.data.target && typeof entry.data.threadId !== "undefined") {
      this.logEvent.emit("status", entry);
    }

    if (entry.data && entry.data.progress) {
      this.logEvent.emit("progress", entry.data.progress);
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    this.logEvent.emit("summary", { schedulerRunSummary, logEntries: this.logEntries });
    clearTimeout(this.timer);
  }
}
