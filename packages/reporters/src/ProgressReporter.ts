import { LogLevel } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import {
  noLoggingConfig,
  setStdoutOverride,
  TaskReporter,
  type TaskReporterOptions,
  type TaskReporterTask,
} from "@ms-cloudpack/task-reporter";
import type { Target } from "@lage-run/target-graph";
import chalk from "chalk";
import type { Writable } from "stream";
import { formatHrtime, hrtimeDiff } from "./formatDuration.js";
import { fancyGradient, formatBytes, formatMemoryUsage, hrLine } from "./formatHelpers.js";
import { slowestTargetRuns } from "./slowestTargetRuns.js";
import { colors, statusColorFn } from "./LogReporter.js";
import type { TargetLogEntry, MaybeTargetLogEntry, TargetReporter } from "./types/TargetReporter.js";
import { isTargetLogEntry, isTargetStatusLogEntry } from "./isTargetLogEntry.js";

/**
 * Shows progress including the names of currently running targets using `@ms-cloudpack/task-reporter`.
 * It may be slightly slower than `BasicReporter` (though its performance has been improved substantially
 * with `task-reporter` updates) and was the default reporter in lage v2 prior to 2.14.16.
 */
export class ProgressReporter implements TargetReporter {
  private logStream: Writable;
  private hasLogStreamOverride: boolean;
  private logEntries: Map<string, TargetLogEntry[]> = new Map<string, TargetLogEntry[]>();
  private taskReporter: TaskReporter;
  private tasks: Map<string, TaskReporterTask> = new Map();
  private logMemory: boolean;

  constructor(
    private options: {
      concurrency: number;
      version: string;
      /** Whether to capture and report main process memory usage on target completion */
      logMemory?: boolean;
      /**
       * Stream for output (defaults to process.stdout). If provided, the reporter will also call
       * the **global** `setStdoutOverride` from `@ms-cloudpack/task-reporter` to use this writer.
       */
      logStream?: Writable;
      /** Cloudpack TaskReporter option overrides for testing */
      taskReporterOptions?: TaskReporterOptions;
    }
  ) {
    this.logMemory = !!options.logMemory;
    this.logStream = options.logStream || process.stdout;
    this.hasLogStreamOverride = !!options.logStream;
    if (this.hasLogStreamOverride) {
      setStdoutOverride({ write: (chunk) => options.logStream?.write(chunk), columns: 80 });
    }

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
      showStarted: true,
      showTaskDetails: true,
      showTaskExtended: true,
      ...options.taskReporterOptions,
      showSummary: false, // lage handles its own summary
    });

    this.print(`${fancyGradient("lage")} - Version ${options.version} - ${options.concurrency} Workers`);
  }

  public log(entry: MaybeTargetLogEntry): void {
    const isTargetLog = isTargetLogEntry(entry);

    // save the logs for errors
    if (isTargetLog && entry.data.target.id) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }
      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    // if "hidden", do not even attempt to record or report the entry
    if (isTargetLog && entry.data.target.hidden) {
      return;
    }

    if (!isTargetLog || !isTargetStatusLogEntry(entry.data)) {
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
    const { targetRuns, targetRunByStatus } = schedulerRunSummary;
    const { failed, skipped, success, pending, running, queued } = targetRunByStatus;
    const allAborted = [...targetRunByStatus.aborted];

    // If we are printing summary, and there are still some running / queued tasks - report them as aborted
    for (const wrappedTarget of running.concat(queued)) {
      const reporterTask = this.tasks.get(wrappedTarget);
      if (reporterTask) {
        reporterTask.complete({ status: "abort" });
      }
      allAborted.push(wrappedTarget);
    }

    // Complete the task reporter to ensure all stickies and timers are cleared.
    // (It would also end running or pending tasks, but we're handling that slightly differently above.)
    this.taskReporter.complete();

    if (targetRuns.size > 0) {
      this.print(chalk.cyanBright(`\nSummary`));

      this.print(hrLine);

      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        const { target, status, duration, queueTime, startTime } = wrappedTarget;
        if (target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[status] ?? chalk.white;
        const queueDuration = duration && queueTime ? hrtimeDiff(queueTime, startTime) : undefined;

        this.print(
          `${target.label} ${colorFn(
            `${status === "running" ? "running - incomplete" : status}${
              queueDuration ? `, took ${formatHrtime(duration)}, queued for ${formatHrtime(queueDuration)}` : ""
            }`
          )}`
        );
      }

      this.print(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${allAborted.length}, failed: ${failed.length}`
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

    this.print(`Took a total of ${formatHrtime(schedulerRunSummary.duration)} to complete. ${allCacheHitText}`);
  }

  /**
   * Complete any remaining tasks (without logging), dispose the TaskReporter, and restore
   * the default stdout from `@ms-cloudpack/task-reporter` if it was overridden.
   */
  public async cleanup(): Promise<void> {
    try {
      // Ensure no completion logs are shown in this case
      this.taskReporter.setOptions(noLoggingConfig);
      this.taskReporter.complete();
    } catch {
      // complete() will throw if cleanup() is called multiple times
    }
    await this.taskReporter.dispose();
    if (this.hasLogStreamOverride) {
      // Restore the default stdout if it was overridden
      setStdoutOverride(undefined);
    }
  }
}
