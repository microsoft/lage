import { type LogEntry, type Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import chalk from "chalk";
import gradient from "gradient-string";
import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { formatBytes } from "./formatBytes.js";
import logUpdate from "log-update";

const hrLine = "┈".repeat(80);

type CompletionStatus = "success" | "failed" | "skipped" | "aborted";

function isCompletionStatus(status: TargetStatus): status is CompletionStatus {
  return status === "success" || status === "failed" || status === "skipped" || status === "aborted";
}

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

function fancy(str: string) {
  return gradient({ r: 237, g: 178, b: 77 }, "cyan")(str);
}

export class BasicReporter implements Reporter {
  private taskData = new Map<string, { target: Target, status: TargetStatus, logEntries: LogEntry[] }>();
  private updateTimer: NodeJS.Timeout;
  private taskStats: { total: number, completed: number, running: number, notStarted: number } | undefined;
  private lastStatus: string = '';
  

  constructor(options: { concurrency: number; version: string; frequency?: number } = { concurrency: 0, version: "0.0.0" }) {
    const { concurrency, version, frequency = 500 } = options;
    console.log(`${fancy("lage")} - Version ${version} - ${concurrency} Workers`);
    this.updateTimer = setInterval(() => this.renderStatus(), frequency);
  }

  log(entry: LogEntry<any>) {
    if (entry.data && entry.data.target && !entry.data.target.hidden) {
      const target: Target = entry.data.target;

      let taskData = this.taskData.get(target.id);
      if (!taskData) {
        taskData = { target: target, status: "pending", logEntries: [] };
        this.taskData.set(target.id, taskData);
      }
  
      taskData.logEntries.push(entry);
      
      if (entry.data.status) {
        const { status, duration } = entry.data;
        taskData.status = status;
        this.taskStats = undefined; // Invalidate cache, recalculate on next render
        
        if (isCompletionStatus(status)) {
          this.logCompletion({ target, status, duration });
        }
      }
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    clearInterval(this.updateTimer);
    logUpdate.clear();

    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    if (targetRuns.size > 0) {
      console.log(colors.summary(`\nSummary`));
      console.log(hrLine);
      console.log(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`
      );

      console.log(
        `worker restarts: ${schedulerRunSummary.workerRestarts}, max worker memory usage: ${formatBytes(schedulerRunSummary.maxWorkerMemoryUsage)}`
      );
    } else {
      console.log("Nothing has been run.");
    }

    console.log(hrLine);

    for (const targetId of failed) {
      const target = targetRuns.get(targetId)?.target;
      if (target) {
        const failureLogs = this.taskData.get(targetId)?.logEntries;

        console.log(`[${colors.pkg(target.packageName ?? "<root>")} ${colors.task(target.task)}] ${colors.failed("ERROR DETECTED")}`);

        if (failureLogs) {
          for (const entry of failureLogs) {
            console.log(entry.msg);
          }
        }
        console.log(hrLine);
      }
    }

    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? fancy(`All targets skipped!`) : "";

    console.log(`Took a total of ${formatDuration(hrToSeconds(duration))} to complete. ${allCacheHitText}`);
  }

  private logCompletion(completion: { target: Target; status: CompletionStatus; duration: any; }) {
      const timestamp = this.getTimestamp();
      const icon = icons[completion.status];
      const statusColor = colors[completion.status];
      const durationText = completion.duration ? ` (${formatDuration(hrToSeconds(completion.duration))})` : "";

      const message = `${timestamp} ${statusColor(`${icon} ${completion.status.padEnd(8)}`)} ${colors.label(completion.target.label)}${colors.duration(durationText)}`;
      this.logMessage(message);
  }

  private renderStatus() {
    if (!this.taskStats) {
      const total = this.taskData.size;
      let completed = 0;
      let running = 0;
      let notStarted = 0;

      for (const data of this.taskData.values()) {
        if (isCompletionStatus(data.status)) {
          completed++;
        } else if (data.status === "running") {
          running++;
        } else {
          notStarted++;
        }
      }
      this.taskStats = { total, completed, running, notStarted };
    }

    const { total, completed, running, notStarted } = this.taskStats;   
    const timestamp = this.getTimestamp(); 

    if (total > 0) {
      const percentage = Math.round((completed / total) * 100);
      this.updateProgressLine(`${timestamp} Completed: ${completed}/${total} (${percentage}%) [${running} running, ${notStarted} not started]`);
    } else {
      this.updateProgressLine(`${timestamp} Initializing build tasks...`);
    }
  }

  private getTimestamp(): string {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    return colors.timestamp(`[${time}]`);
  }

  private logMessage(text: string) {
    logUpdate.clear();
    console.log(text);
    logUpdate(this.lastStatus);
  }

  private updateProgressLine(text: string) {
    this.lastStatus = text;
    logUpdate(text);
  }
}
