import type { LogEntry, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import type { Writable } from "stream";
import chalk from "chalk";
import { formatHrtime } from "./formatDuration.js";
import { fancyGradient, formatBytes, formatMemoryUsage, hrLine } from "./formatHelpers.js";

type CoarseStatus = "completed" | "running" | "pending";

const coarseStatus: Record<TargetStatus, CoarseStatus> = {
  success: "completed",
  failed: "completed",
  skipped: "completed",
  aborted: "completed",
  running: "running",
  pending: "pending",
  queued: "pending",
};

type CompletionStatus = "success" | "failed" | "skipped" | "aborted";
const isCompletionStatus = (status: TargetStatus): status is CompletionStatus => coarseStatus[status] === "completed";

const colors = {
  label: chalk.white,
  timestamp: chalk.gray,
  duration: chalk.gray,
  success: chalk.green,
  failed: chalk.red,
  skipped: chalk.gray,
  aborted: chalk.yellow,
  summary: chalk.cyanBright,
  task: chalk.hex("#00DDDD"),
  pkg: chalk.hex("#FFD66B"),
};

const icons: Record<CompletionStatus, string> = {
  success: "✓",
  failed: "✗",
  skipped: "-",
  aborted: "-",
};

const terminal = {
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K\r",
};

/**
 * Shows running/remaining target counts and completed targets, but does not display
 * the names of running targets for efficiency.
 */
export class BasicReporter implements Reporter {
  private taskData = new Map<string, { target: Target; status: TargetStatus; logEntries: LogEntry[] }>();
  private updateTimer: NodeJS.Timeout | undefined;
  private startTimer: () => void;
  private logMemory: boolean;
  private logStream: Writable;

  constructor(
    params: {
      concurrency?: number;
      version?: string;
      frequency?: number;
      /** Whether to capture and report main process memory usage on target completion */
      logMemory?: boolean;
      /** Stream for output (defaults to process.stdout) */
      logStream?: Writable;
    } = {}
  ) {
    const { concurrency = 0, version = "0.0.0", frequency = 500 } = params;
    this.logMemory = !!params.logMemory;
    this.logStream = params.logStream || process.stdout;
    this.print(`${fancyGradient("lage")} - Version ${version} - ${concurrency} Workers`);

    this.startTimer = () => {
      this.updateTimer = setInterval(() => this.renderStatus(), frequency);
      this.updateTimer.unref();
      this.startTimer = () => {};
    };

    if (!params.logStream) {
      // Only hide and show the cursor if writing to the default stdout
      // (definitely don't want the exit handler if writing to a custom stream)
      process.stdout.write(terminal.hideCursor);
      process.on("exit", () => process.stdout.write(terminal.showCursor));
    }
  }

  public log(entry: LogEntry): void {
    const data = entry.data;
    if (!data?.target || data.target.hidden) return;

    let taskData = this.taskData.get(data.target.id);
    if (!taskData) {
      taskData = { target: data.target, status: "pending", logEntries: [] };
      this.taskData.set(data.target.id, taskData);
    }

    this.startTimer();
    taskData.logEntries.push(entry);

    if (data.status) {
      taskData.status = data.status;
      if (isCompletionStatus(data.status)) {
        this.reportCompletion({ target: data.target, status: data.status, duration: data.duration, memoryUsage: data.memoryUsage });
      }
    }
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    clearInterval(this.updateTimer);
    this.logStream.write(terminal.clearLine);

    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    if (targetRuns.size > 0) {
      this.print(colors.summary(`\nSummary`));
      this.print(hrLine);
      this.print(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`
      );
      this.print(
        `worker restarts: ${schedulerRunSummary.workerRestarts}, max worker memory usage: ${formatBytes(schedulerRunSummary.maxWorkerMemoryUsage)}`
      );
    } else {
      this.print("Nothing has been run.");
    }

    this.print(hrLine);

    for (const targetId of failed) {
      const target = targetRuns.get(targetId)?.target;
      if (target) {
        const failureLogs = this.taskData.get(targetId)?.logEntries;

        this.print(`[${colors.pkg(target.packageName ?? "<root>")} ${colors.task(target.task)}] ${colors.failed("ERROR DETECTED")}`);

        if (failureLogs) {
          for (const entry of failureLogs) {
            this.print(entry.msg);
          }
        }
        this.print(hrLine);
      }
    }

    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? fancyGradient(`All targets skipped!`) : "";

    this.print(`Took a total of ${formatHrtime(duration)} to complete. ${allCacheHitText}`);
  }

  /** Clear the update timer */
  public cleanup(): void {
    clearInterval(this.updateTimer);
    this.updateTimer = undefined;
  }

  private reportCompletion(completion: {
    target: Target;
    status: CompletionStatus;
    duration?: [number, number];
    memoryUsage?: NodeJS.MemoryUsage;
  }) {
    const icon = icons[completion.status];
    const statusColor = colors[completion.status];
    const durationText = completion.duration ? ` (${formatHrtime(completion.duration)})` : "";
    const memText = formatMemoryUsage(completion.memoryUsage, this.logMemory);

    const message = `${statusColor(`${icon} ${completion.status.padEnd(8)}`)} ${colors.label(completion.target.label)}${colors.duration(durationText + memText)}`;
    this.renderStatus(message);
  }

  private renderStatus(completedTaskMessage?: string) {
    const counts: Record<CoarseStatus, number> = { completed: 0, running: 0, pending: 0 };
    for (const data of this.taskData.values()) {
      counts[coarseStatus[data.status]]++;
    }
    const { completed, running, pending } = counts;
    const total = this.taskData.size;
    const timestamp = colors.timestamp(`[${new Date().toLocaleTimeString("en-US", { hour12: false })}]`);

    let output = terminal.clearLine;
    if (completedTaskMessage) {
      output += `${timestamp} ${completedTaskMessage}\n`;
    }
    const percentage = Math.round((completed / total) * 100);
    output += `${timestamp} Completed: ${completed}/${total} (${percentage}%) [${running} running, ${pending} pending]`;
    this.logStream.write(output);
  }

  private print(message: string): void {
    this.logStream.write(message + "\n");
  }
}
