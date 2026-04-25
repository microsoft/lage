import { formatHrtime } from "./formatDuration.js";
import { isTargetLogEntry, isTargetStatusData } from "./isTargetLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import type { SchedulerRunSummary, TargetRun } from "@lage-run/scheduler-types";
import type { Writable } from "stream";
import { slowestTargetRuns } from "./slowestTargetRuns.js";
import { formatMemoryUsage } from "./formatHelpers.js";
import { statusColorFn } from "./LogReporter.js";
import type { MaybeTargetLogEntry, TargetLogEntry, TargetReporter } from "./types/TargetReporter.js";
import { isNonFailureCompletionStatus } from "./isCompletionStatus.js";

export const colors = {
  [LogLevel.info]: chalk.white,
  [LogLevel.verbose]: chalk.gray,
  [LogLevel.warn]: chalk.white,
  [LogLevel.error]: chalk.white,
  [LogLevel.silly]: chalk.green,
  task: chalk.cyan,
  pkg: chalk.magenta,
  ok: chalk.green,
  error: chalk.red,
  warn: chalk.yellow,
};

const logLevelLabel = {
  [LogLevel.info]: "INFO",
  [LogLevel.warn]: "WARN",
  [LogLevel.error]: "ERR!",
  [LogLevel.silly]: "SILLY",
  [LogLevel.verbose]: "VERB",
};

function getTaskLogPrefix(pkg: string, task: string): string {
  return `${colors.pkg(pkg)} ${colors.task(task)}`;
}

function format(level: LogLevel, prefix: string, message: string): string {
  return `${logLevelLabel[level]}: ${prefix} ${message}\n`;
}

export interface GroupedReporterOptions {
  /** Only report logs with this level or numerically lower/logically higher (default info) */
  logLevel?: LogLevel;

  /** Whether to group log entries by target */
  grouped?: boolean;

  /** Whether to capture and report main process memory usage on target completion */
  logMemory?: boolean;

  /** stream for testing (defaults to stdout) */
  logStream?: Writable;
}

/**
 * Abstract reporter which optionally groups log entries by target.
 * If grouping is enabled, it only flushes a target's log entries when it completes.
 */
export abstract class GroupedReporter implements TargetReporter {
  protected logStream: Writable;
  /** Mapping from targetId log entries (the logs will be cleared for non-failed completed targets) */
  protected logEntries = new Map<string, TargetLogEntry[]>();

  constructor(protected options: GroupedReporterOptions) {
    options.logLevel ??= LogLevel.info;
    this.logStream = options.logStream || process.stdout;
  }

  public log(entry: MaybeTargetLogEntry): void {
    if (isTargetLogEntry(entry)) {
      if (entry.data.target.hidden) return;
    } else {
      // log generic entries (not related to target)
      if (this.shouldLog(entry) && entry.msg.trim()) {
        this.logStream.write(format(entry.level, "", entry.msg));
      }
      return;
    }

    // save the logs for errors (regardless of level)
    const targetId = entry.data.target.id;
    if (!this.logEntries.has(targetId)) {
      this.logEntries.set(targetId, []);
    }
    this.logEntries.get(targetId)!.push(entry);

    if (this.shouldLog(entry)) {
      if (this.options.grouped) {
        this.logTargetEntryByGroup(entry);
      } else {
        this.logEntry(entry);
      }
    }

    // If it's a status message for non-failure completion, delete the target's entries to free memory
    if (isTargetStatusData(entry.data) && isNonFailureCompletionStatus(entry.data.status)) {
      this.logEntries.delete(targetId);
    }
  }

  /**
   * Whether the entry should be logged based solely on its level compared to the reporter's `logLevel`
   * (does not consider `entry.target.hidden` or message presence)
   */
  protected shouldLog(entry: MaybeTargetLogEntry): boolean {
    return this.options.logLevel! >= entry.level;
  }

  /** Print the entry for a target */
  protected logEntry(entry: TargetLogEntry): boolean | void {
    const colorFn = colors[entry.level];

    const data = entry.data;
    const { target } = data;
    const { packageName, task } = target;
    const prefix = this.options.grouped ? "" : getTaskLogPrefix(packageName ?? "<root>", task);

    if (!isTargetStatusData(data)) {
      return this.logStream.write(format(entry.level, prefix, colorFn("|  " + entry.msg)));
    }

    const { hash, duration, memoryUsage, status } = data;
    const mem = formatMemoryUsage(memoryUsage, this.options.logMemory);

    const pkgTask = this.options.grouped ? `${chalk.magenta(packageName)} ${chalk.cyan(task)}` : "";

    switch (status) {
      case "running":
        return this.logStream.write(format(entry.level, prefix, colorFn(`${colors.ok("➔")} start ${pkgTask}`)));

      case "success":
        return this.logStream.write(
          format(entry.level, prefix, colorFn(`${colors.ok("✓")} done ${pkgTask} - ${formatHrtime(duration!)}${mem}`))
        );

      case "failed":
        return this.logStream.write(format(entry.level, prefix, colorFn(`${colors.error("✖")} fail ${pkgTask}${mem}`)));

      case "skipped":
        return this.logStream.write(format(entry.level, prefix, colorFn(`${colors.ok("»")} skip ${pkgTask} - ${hash!}${mem}`)));

      case "aborted":
        return this.logStream.write(format(entry.level, prefix, colorFn(`${colors.warn("-")} aborted ${pkgTask}`)));

      case "queued":
        return this.logStream.write(format(entry.level, prefix, colorFn(`${colors.warn("…")} queued ${pkgTask}`)));

      case "pending":
        return;

      default:
        throw new Error(`Internal error: unhandled target status "${status}"`);
    }
  }

  private logTargetEntryByGroup(entry: TargetLogEntry) {
    const data = entry.data;

    const target = data.target;
    const { id } = target;

    if (isTargetStatusData(data)) {
      if (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted") {
        const { status, duration } = data;
        this.logStream.write(this.formatGroupStart(data.target.packageName ?? "<root>", data.target.task, status, duration));

        const entries = this.logEntries.get(id)!;
        for (const targetEntry of entries) {
          this.logEntry(targetEntry);
        }

        this.logStream.write(this.formatGroupEnd());
      }
    }
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { targetRuns, targetRunByStatus } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    this.writeSummaryHeader();

    if (targetRuns.size > 0) {
      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        const { target, status, duration } = wrappedTarget;

        const colorFn = statusColorFn[status] ?? chalk.white;

        this.logStream.write(
          format(
            LogLevel.info,
            getTaskLogPrefix(target.packageName || "[GLOBAL]", target.task),
            colorFn(`${status}${duration ? `, took ${formatHrtime(duration)}` : ""}`)
          )
        );
      }

      this.logStream.write(
        `[Tasks Count] success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}\n`
      );
    } else {
      this.logStream.write("Nothing has been run.\n");
    }

    this.writeSummaryFooter();

    if (failed.length > 0) {
      this.writeFailures(failed, targetRuns);
    }

    const formattedDuration = formatHrtime(schedulerRunSummary.duration);
    this.logStream.write(format(LogLevel.info, "", `Took a total of ${formattedDuration} to complete`));
  }

  /** Returns the opening line for a grouped target log block, including trailing newline. */
  protected abstract formatGroupStart(packageName: string, task: string, status: string, duration?: [number, number]): string;

  /** Returns the closing line for a grouped target log block, including trailing newline. */
  protected abstract formatGroupEnd(): string;

  /** Writes the summary section header. */
  protected abstract writeSummaryHeader(): void;

  /** Writes anything needed after the summary target list (e.g. closing a group). */
  protected abstract writeSummaryFooter(): void;

  /** Writes per-CI-system error annotations for all failed targets. */
  protected abstract writeFailures(failed: string[], targetRuns: Map<string, TargetRun<unknown>>): void;
}
