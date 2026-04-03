import { formatHrtime, hrtimeDiff } from "./formatDuration.js";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import type { Chalk } from "chalk";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { TargetLogData, TargetStatusData } from "./types/TargetLogData.js";
import type { Writable } from "stream";
import crypto from "crypto";
import { fancyGradient, formatBytes, formatMemoryUsage, hrLine, stripAnsi } from "./formatHelpers.js";
import { slowestTargetRuns } from "./slowestTargetRuns.js";

/** Color scheme from lage v1's reporter and others derived from it */
export const colors = {
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

/** Status color scheme from lage v1's reporter and others derived from it */
export const statusColorFn: Record<TargetStatus, Chalk> = {
  success: chalk.greenBright,
  failed: chalk.redBright,
  skipped: chalk.gray,
  running: chalk.yellow,
  pending: chalk.gray,
  aborted: chalk.red,
  queued: chalk.magenta,
};

// Monokai color scheme
const pkgColors: Chalk[] = [
  chalk.hex("#e5b567"),
  chalk.hex("#b4d273"),
  chalk.hex("#e87d3e"),
  chalk.hex("#9e86c8"),
  chalk.hex("#b05279"),
  chalk.hex("#6c99bb"),
];

function hashStringToNumber(str: string): number {
  const hash = crypto.createHash("md5");
  hash.update(str);
  const hex = hash.digest("hex").substring(0, 6);
  return parseInt(hex, 16);
}

const pkgNameToIndexInPkgColorArray = new Map<string, number>();

function getColorForPkg(pkg: string): Chalk {
  if (!pkgNameToIndexInPkgColorArray.has(pkg)) {
    const index = hashStringToNumber(pkg) % pkgColors.length;
    pkgNameToIndexInPkgColorArray.set(pkg, index);
  }

  return pkgColors[pkgNameToIndexInPkgColorArray.get(pkg)!];
}

function getTaskLogPrefix(pkg: string, task: string) {
  const pkgColor = getColorForPkg(pkg);
  return `${pkgColor(pkg)} ${colors.task(task)}`;
}

/**
 * Lage v1 reporter that logs tasks without progress spinners.
 * It can either log entries immediately, or grouped when a target completes.
 */
export class LogReporter implements Reporter {
  private logStream: Writable;
  private logEntries = new Map<string, LogEntry[]>();

  constructor(
    private options: {
      logLevel?: LogLevel;
      grouped?: boolean;
      /** Whether to capture and report main process memory usage on target completion */
      logMemory?: boolean;
      /** stream for testing */
      logStream?: Writable;
    }
  ) {
    options.logLevel = options.logLevel || LogLevel.info;
    this.logStream = options.logStream || process.stdout;
  }

  public log(entry: LogEntry<any>): void {
    // if "hidden", do not even attempt to record or report the entry
    if (entry?.data?.target?.hidden) {
      return;
    }

    // save the logs for errors
    if (entry.data?.target?.id) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }
      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    // if loglevel is not high enough, do not report the entry
    if (this.options.logLevel! < entry.level) {
      return;
    }

    // log to grouped entries
    if (this.options.grouped && entry.data?.target) {
      return this.logTargetEntryByGroup(entry);
    }

    // log normal target entries
    if (entry.data && entry.data.target) {
      return this.logTargetEntry(entry);
    }

    // log generic entries (not related to target)
    if (entry.msg) {
      return this.print(entry.msg);
    }
  }

  private printEntry(entry: LogEntry<any>, message: string) {
    let prefix = "";
    const msg = message;

    if (entry?.data?.target) {
      const { packageName, task } = entry.data.target;
      prefix = getTaskLogPrefix(packageName ?? "<root>", task);
    }

    this.print(`${prefix ? prefix + " " : ""}${msg}`);
  }

  private print(message: string) {
    this.logStream.write(message + "\n");
  }

  private logTargetEntry(entry: LogEntry<TargetLogData>) {
    const colorFn = colors[entry.level];
    const data = entry.data!;

    if (!isTargetStatusLogEntry(data)) {
      return this.printEntry(entry, colorFn(":  " + stripAnsi(entry.msg)));
    }

    const { hash, duration, memoryUsage, status } = data;
    const mem = formatMemoryUsage(memoryUsage, this.options.logMemory);

    switch (status) {
      case "running":
        return this.printEntry(entry, colorFn(`${colors.ok("➔")} start`));

      case "success":
        return this.printEntry(entry, colorFn(`${colors.ok("✓")} done - ${formatHrtime(duration!)}${mem}`));

      case "failed":
        return this.printEntry(entry, colorFn(`${colors.error("✖")} fail${mem}`));

      case "skipped":
        return this.printEntry(entry, colorFn(`${colors.ok("»")} skip - ${hash!}${mem}`));

      case "aborted":
        return this.printEntry(entry, colorFn(`${colors.warn("-")} aborted`));

      case "queued":
        return this.printEntry(entry, colorFn(`${colors.warn("…")} queued`));

      case "pending":
        return;

      default:
        throw new Error(`Internal error: unhandled target status "${status}"`);
    }
  }

  private logTargetEntryByGroup(entry: LogEntry<TargetLogData>) {
    const data = entry.data!;

    const target = data.target;
    const { id } = target;

    if (
      isTargetStatusLogEntry(data) &&
      (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted")
    ) {
      const entries = this.logEntries.get(id)! as LogEntry<TargetStatusData>[];

      for (const targetEntry of entries) {
        this.logTargetEntry(targetEntry);
      }

      if (entries.length > 2) {
        this.print(hrLine);
      }
    }
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { targetRuns, targetRunByStatus } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    if (targetRuns.size > 0) {
      this.print(chalk.cyanBright(`\nSummary`));

      this.print(hrLine);

      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        const { target, status, duration } = wrappedTarget;
        if (target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[status] ?? chalk.white;
        const queueDuration = hrtimeDiff(wrappedTarget.queueTime, wrappedTarget.startTime);

        this.print(
          `${getTaskLogPrefix(target.packageName || "<root>", target.task)} ${colorFn(
            `${status === "running" ? "running - incomplete" : status}${
              duration ? `, took ${formatHrtime(duration)}, queued for ${formatHrtime(queueDuration)}` : ""
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

    this.print(`Took a total of ${formatHrtime(schedulerRunSummary.duration)} to complete. ${allCacheHitText}`);
  }

  public resetLogEntries(): void {
    this.logEntries.clear();
  }
}
