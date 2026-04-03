import { type LogEntry, LogLevel, type Reporter, type LogStructuredData } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import { TaskReporter, type TaskReporterTask } from "@ms-cloudpack/task-reporter";
import type { Target } from "@lage-run/target-graph";
import chalk from "chalk";
import type { Writable } from "stream";
import { formatHrtime, hrtimeDiff } from "./formatDuration.js";
import { fancyGradient, formatBytes, formatMemoryUsage, hrLine } from "./formatHelpers.js";
import { slowestTargetRuns } from "./slowestTargetRuns.js";
import { colors, statusColorFn } from "./LogReporter.js";

/**
 * Shows progress including the names of currently running targets using `@ms-cloudpack/task-reporter`.
 * It may be slightly slower than `BasicReporter` (though its performance has been improved substantially
 * with `task-reporter` updates) and was the default reporter in lage v2 prior to 2.14.16.
 */
export class ProgressReporter implements Reporter {
  public logStream: Writable = process.stdout;

  private logEntries: Map<string, LogEntry<LogStructuredData>[]> = new Map<string, LogEntry[]>();

  private taskReporter: TaskReporter;
  private tasks: Map<string, TaskReporterTask> = new Map();
  private logMemory: boolean;

  constructor(
    private options: {
      concurrency: number;
      version: string;
      /** Whether to capture and report main process memory usage on target completion */
      logMemory?: boolean;
    } = { concurrency: 0, version: "0.0.0" }
  ) {
    this.logMemory = !!options.logMemory;
    this.taskReporter = this.createTaskReporter();

    this.print(`${fancyGradient("lage")} - Version ${options.version} - ${options.concurrency} Workers`);
  }

  private createTaskReporter(): TaskReporter {
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
      showStarted: true,
      showSummary: true,
      showTaskDetails: true,
      showTaskExtended: true,
    });
  }

  public log(entry: LogEntry<any>): void {
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

    if (!entry.data?.status || !entry.data?.target) {
      return;
    }

    const target: Target = entry.data.target;

    const reporterTask = this.tasks.has(target.id) ? this.tasks.get(target.id)! : this.taskReporter.addTask(target.label, true);

    this.tasks.set(target.id, reporterTask);

    const { status, memoryUsage } = entry.data;
    const memoryMessage = formatMemoryUsage(memoryUsage, this.logMemory);

    switch (status) {
      case "running":
        reporterTask.start();
        break;

      case "success":
        reporterTask.complete({ status: "complete", message: memoryMessage });
        break;

      case "aborted":
        reporterTask.complete({ status: "abort" });
        break;

      case "skipped":
        reporterTask.complete({ status: "skip", message: memoryMessage });
        break;

      case "failed":
        reporterTask.complete({ status: "fail", message: memoryMessage });
        break;
    }
  }

  private print(message: string) {
    this.logStream.write(message + "\n");
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending, running, queued } = targetRunByStatus;

    // If we are printing summary, and there are still some running / queued tasks - report them as aborted
    for (const wrappedTarget of running.concat(queued)) {
      const reporterTask = this.tasks.get(wrappedTarget);
      if (reporterTask) {
        reporterTask.complete({ status: "abort" });
      }
    }

    if (targetRuns.size > 0) {
      this.print(chalk.cyanBright(`\nSummary`));

      this.print(hrLine);

      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        if (wrappedTarget.target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[wrappedTarget.status] ?? chalk.white;
        const target = wrappedTarget.target;
        const hasDurations = !!wrappedTarget.duration && !!wrappedTarget.queueTime;
        const queueDuration: [number, number] = hasDurations ? hrtimeDiff(wrappedTarget.queueTime, wrappedTarget.startTime) : [0, 0];

        if (wrappedTarget.status === "running") {
          const reporterTask = this.tasks.get(wrappedTarget.target.id);
          if (reporterTask) {
            reporterTask.complete({ status: "fail" });
          }
        }

        this.print(
          `${target.label} ${colorFn(
            `${wrappedTarget.status === "running" ? "running - incomplete" : wrappedTarget.status}${
              hasDurations ? `, took ${formatHrtime(wrappedTarget.duration)}, queued for ${formatHrtime(queueDuration)}` : ""
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

    this.print(hrLine);

    if (failed.length > 0) {
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

          this.print(hrLine);
        }
      }
    }

    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? fancyGradient(`All targets skipped!`) : "";

    this.print(`Took a total of ${formatHrtime(duration)} to complete. ${allCacheHitText}`);
  }
}
