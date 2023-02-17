import EventEmitter from "events";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";

import fs from "fs";
import path from "path";

// @ts-ignore
import type { TaskReporter as TaskReporterType, TaskReporterTask } from "@ms-cloudpack/task-reporter";

export class ProgressReporter implements Reporter {
  startTime: [number, number] = [0, 0];

  logEvent: EventEmitter = new EventEmitter();
  logEntries = new Map<string, LogEntry[]>();

  taskReporter: TaskReporterType | undefined;
  tasks: Map<string, TaskReporterTask> = new Map();

  constructor(private options: { concurrency: number; version: string } = { concurrency: 0, version: "0.0.0" }) {
    
  }

  async reporter() {
    if (!this.taskReporter) {
      const TaskReporter = (await import("@ms-cloudpack/task-reporter")).TaskReporter;
      this.taskReporter = new TaskReporter({
        productName: "lage",
        version: this.options.version,
        showCompleted: true,
        showConsoleDebug: true,
        showConsoleError: true,
        showConsoleInfo: true,
        showConsoleLog: true,
        showConsoleWarn: true,
        showErrors: true,
        showPending: true,
        showProgress: true,
        showStarted: true,
        showSummary: true,
        showTaskDetails: true,
        showTaskExtended: true,
      });
    }

    return this.taskReporter;
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

    if (entry.data && entry.data.status) {
      this.logEvent.emit("status", entry.data);
    }

    // if (entry.data && entry.data.progress) {
    //   this.logEvent.emit("progress", entry.data.progress);
    // }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    this.logEvent.emit("summary", { schedulerRunSummary, logEntries: this.logEntries });
  }
}
