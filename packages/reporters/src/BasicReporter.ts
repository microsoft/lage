import { type LogEntry, type Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import chalk from "chalk";
import gradient from "gradient-string";
import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { formatBytes } from "./formatBytes.js";

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

const hrLine = "┈".repeat(80);

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

const fancy = (str: string) => gradient({ r: 237, g: 178, b: 77 }, "cyan")(str);
const print = (message: string) => process.stdout.write(message + "\n");

export class BasicReporter implements Reporter {
  private taskData = new Map<string, { target: Target; status: TargetStatus; logEntries: LogEntry[] }>();
  private updateTimer: NodeJS.Timeout;

  constructor({ concurrency = 0, version = "0.0.0", frequency = 500 } = {}) {
    print(`${fancy("lage")} - Version ${version} - ${concurrency} Workers`);

    process.stdout.write(terminal.hideCursor);
    process.on("exit", () => process.stdout.write(terminal.showCursor));

    this.updateTimer = setInterval(() => this.renderStatus(), frequency);
    this.updateTimer.unref();
  }

  log(entry: LogEntry) {
    const data = entry.data;
    if (!data?.target || data.target.hidden) return;

    let taskData = this.taskData.get(data.target.id);
    if (!taskData) {
      taskData = { target: data.target, status: "pending", logEntries: [] };
      this.taskData.set(data.target.id, taskData);
    }

    taskData.logEntries.push(entry);

    if (data.status) {
      taskData.status = data.status;
      if (isCompletionStatus(data.status)) {
        this.reportCompletion({ target: data.target, status: data.status, duration: data.duration });
      }
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    clearInterval(this.updateTimer);
    process.stdout.write(terminal.clearLine);

    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    if (targetRuns.size > 0) {
      print(colors.summary(`\nSummary`));
      print(hrLine);
      print(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`
      );
      print(
        `worker restarts: ${schedulerRunSummary.workerRestarts}, max worker memory usage: ${formatBytes(schedulerRunSummary.maxWorkerMemoryUsage)}`
      );
    } else {
      print("Nothing has been run.");
    }

    print(hrLine);

    for (const targetId of failed) {
      const target = targetRuns.get(targetId)?.target;
      if (target) {
        const failureLogs = this.taskData.get(targetId)?.logEntries;

        print(`[${colors.pkg(target.packageName ?? "<root>")} ${colors.task(target.task)}] ${colors.failed("ERROR DETECTED")}`);

        if (failureLogs) {
          for (const entry of failureLogs) {
            print(entry.msg);
          }
        }
        print(hrLine);
      }
    }

    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? fancy(`All targets skipped!`) : "";

    print(`Took a total of ${formatDuration(hrToSeconds(duration))} to complete. ${allCacheHitText}`);
  }

  private reportCompletion(completion: { target: Target; status: CompletionStatus; duration?: [number, number] }) {
    const icon = icons[completion.status];
    const statusColor = colors[completion.status];
    const durationText = completion.duration ? ` (${formatDuration(hrToSeconds(completion.duration))})` : "";

    const message = `${statusColor(`${icon} ${completion.status.padEnd(8)}`)} ${colors.label(completion.target.label)}${colors.duration(durationText)}`;
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
    if (total > 0) {
      const percentage = Math.round((completed / total) * 100);
      output += `${timestamp} Completed: ${completed}/${total} (${percentage}%) [${running} running, ${pending} pending]`;
    } else {
      output += `${timestamp} Initializing build tasks...`;
    }
    process.stdout.write(output);
  }
}
