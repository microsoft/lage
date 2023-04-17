import EventEmitter from "events";
import { type LogEntry, LogLevel, type Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";

// @ts-ignore Ignoring ESM in CJS errors here, but still importing the types to be used
// import type { TaskReporter as TaskReporterType, TaskReporterTask } from "@ms-cloudpack/task-reporter";
import { TaskReporter, type TaskReporterTask } from "@ms-cloudpack/task-reporter";
import type { Target } from "@lage-run/target-graph";
import gradient from "gradient-string";
import chalk from "chalk";
import type { Writable } from "stream";
import { formatDuration, hrToSeconds, hrtimeDiff } from "@lage-run/format-hrtime";
import { formatBytes } from "./formatBytes.js";
import { slowestTargetRuns } from "./slowestTargetRuns.js";

const colors = {
  [LogLevel.info]: chalk.white,
  [LogLevel.verbose]: chalk.gray,
  [LogLevel.warn]: chalk.white,
  [LogLevel.error]: chalk.hex("#FF1010"),
  [LogLevel.silly]: chalk.green,
  task: chalk.hex("#00DDDD"),
  pkg: chalk.hex("#FFD66B"),
  ok: chalk.green,
  error: chalk.red,
  warn: chalk.yellow,
};

function fancy(str: string) {
  return gradient({ r: 237, g: 178, b: 77 }, "cyan")(str);
}

export class ProgressReporter implements Reporter {
  logStream: Writable = process.stdout;
  startTime: [number, number] = [0, 0];

  logEvent: EventEmitter = new EventEmitter();
  logEntries = new Map<string, LogEntry[]>();

  taskReporter: TaskReporter;
  tasks: Map<string, TaskReporterTask> = new Map();

  constructor(private options: { concurrency: number; version: string } = { concurrency: 0, version: "0.0.0" }) {
    this.taskReporter = this.createTaskReporter();

    this.print(`${fancy("lage")} - Version ${options.version} - ${options.concurrency} Workers`);
  }

  createTaskReporter() {
    return new TaskReporter({
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
      const { targets } = entry.data.schedulerRun;

      for (const target of targets) {
        const task = this.taskReporter.addTask(target.label, true);
        this.tasks.set(target.id, task);
      }
    }

    if (entry.data && entry.data.status && entry.data.target) {
      const target: Target = entry.data.target;
      const status: TargetStatus = entry.data.status;

      const reporterTask = this.tasks.has(target.id) ? this.tasks.get(target.id) : this.taskReporter.addTask(target.label, true);

      if (reporterTask) {
        this.tasks.set(target.id, reporterTask);
        switch (status) {
          case "running":
            reporterTask.start();
            break;

          case "success":
            reporterTask.complete({ status: "complete" });
            break;

          case "aborted":
            reporterTask.complete({ status: "abort" });
            break;

          case "skipped":
            reporterTask.complete({ status: "skip" });
            break;

          case "failed":
            reporterTask.complete({ status: "fail" });
            break;
        }
      }
    }
  }

  private print(message: string) {
    this.logStream.write(message + "\n");
  }

  hr() {
    this.print("┈".repeat(80));
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    const statusColorFn: {
      [status in TargetStatus]: chalk.Chalk;
    } = {
      success: chalk.greenBright,
      failed: chalk.redBright,
      skipped: chalk.gray,
      running: chalk.yellow,
      pending: chalk.gray,
      aborted: chalk.red,
      queued: chalk.magenta,
    };

    if (targetRuns.size > 0) {
      this.print(chalk.cyanBright(`\nSummary`));

      this.hr();

      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        if (wrappedTarget.target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[wrappedTarget.status] ?? chalk.white;
        const target = wrappedTarget.target;
        const hasDurations = !!wrappedTarget.duration && !!wrappedTarget.queueTime;
        const queueDuration: [number, number] = hasDurations ? hrtimeDiff(wrappedTarget.queueTime, wrappedTarget.startTime) : [0, 0];

        this.print(
          `${target.label} ${colorFn(
            `${wrappedTarget.status === "running" ? "running - incomplete" : wrappedTarget.status}${
              hasDurations
                ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}, queued for ${formatDuration(hrToSeconds(queueDuration))}`
                : ""
            }`
          )}`
        );
      }

      this.print(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`
      );

      this.print(
        `worker restarts: ${schedulerRunSummary.workerRestarts}, max worker memory usage: ${formatBytes(
          schedulerRunSummary.maxWorkerMemoryUsage
        )}`
      );
    } else {
      this.print("Nothing has been run.");
    }

    this.hr();

    if (failed && failed.length > 0) {
      for (const targetId of failed) {
        const target = targetRuns.get(targetId)?.target;

        if (target) {
          const { packageName, task } = target;
          const failureLogs = this.logEntries.get(targetId);

          this.print(`[${colors.pkg(packageName ?? "<root>")} ${colors.task(task)}] ${colors[LogLevel.error]("ERROR DETECTED")}`);

          if (failureLogs) {
            for (const entry of failureLogs) {
              // Log each entry separately to prevent truncation
              this.print(entry.msg);
            }
          }

          this.hr();
        }
      }
    }

    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? fancy(`All targets skipped!`) : "";

    this.print(`Took a total of ${formatDuration(hrToSeconds(duration))} to complete. ${allCacheHitText}`);
  }
}
