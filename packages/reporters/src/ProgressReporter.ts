import EventEmitter from "events";
import type { LogEntry, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";

// @ts-ignore Ignoring ESM in CJS errors here, but still importing the types to be used
// import type { TaskReporter as TaskReporterType, TaskReporterTask } from "@ms-cloudpack/task-reporter";
import * as taskReporter from "@ms-cloudpack/task-reporter";
import { Target } from "@lage-run/target-graph";

export class ProgressReporter implements Reporter {
  startTime: [number, number] = [0, 0];

  logEvent: EventEmitter = new EventEmitter();
  logEntries = new Map<string, LogEntry[]>();

  taskReporter: taskReporter.TaskReporter;
  tasks: Map<string, taskReporter.TaskReporterTask> = new Map();

  constructor(private options: { concurrency: number; version: string } = { concurrency: 0, version: "0.0.0" }) {
    this.taskReporter = this.createTaskReporter();
  }

  createTaskReporter() {
    // return import("@ms-cloudpack/task-reporter").then((taskReporterModule) => {
    //   const TaskReporter = taskReporterModule.TaskReporter;
    return new taskReporter.TaskReporter({
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
    // });
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

    if (entry.data && entry.data.status && entry.data.target) {
      const target: Target = entry.data.target;
      const status: TargetStatus = entry.data.status;

      const report = async () => {
        const reporterTask = this.tasks.has(target.id) ? this.tasks.get(target.id) : (await this.taskReporter).addTask(target.label, true);
        switch (status) {
          case "running":
            reporterTask?.start();
            break;

          case "success":
            reporterTask?.complete({ status: "complete" });
            break;

          case "aborted":
            reporterTask?.complete({ status: "abort" });
            break;

          case "skipped":
            reporterTask?.complete({ status: "skip" });
            break;

          case "failed":
            reporterTask?.complete({ status: "fail" });
            break;
        }
      };

      // async, fire & forget here
      report();
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const summarizeAsync = async () => {
      const reporter = await this.taskReporter;
      reporter.complete(schedulerRunSummary.results);
    };

    // async, fire & forget
    summarizeAsync();
  }
}
