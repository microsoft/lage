import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel, type LogStructuredData } from "@lage-run/logger";
import chalk from "chalk";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetRun, TargetStatus } from "@lage-run/scheduler-types";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry.js";
import type { Writable } from "stream";
import { slowestTargetRuns } from "./slowestTargetRuns.js";

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

export const logLevelLabel = {
  [LogLevel.info]: "INFO",
  [LogLevel.warn]: "WARN",
  [LogLevel.error]: "ERR!",
  [LogLevel.silly]: "SILLY",
  [LogLevel.verbose]: "VERB",
};

export function getTaskLogPrefix(pkg: string, task: string): string {
  return `${colors.pkg(pkg)} ${colors.task(task)}`;
}

function normalize(prefixOrMessage: string, message?: string) {
  if (typeof message === "string") {
    const prefix = prefixOrMessage;
    return { prefix, message };
  } else {
    const prefix = "";
    const message = prefixOrMessage;
    return { prefix, message };
  }
}

export function format(level: LogLevel, prefix: string, message: string): string {
  return `${logLevelLabel[level]}: ${prefix} ${message}\n`;
}

export abstract class GroupedReporter implements Reporter {
  protected logStream: Writable;
  protected logEntries = new Map<string, LogEntry[]>();
  private readonly groupedEntries: Map<string, LogEntry<LogStructuredData>[]> = new Map<string, LogEntry[]>();

  constructor(
    protected options: {
      logLevel?: LogLevel;
      grouped?: boolean;
      /** stream for testing */
      logStream?: Writable;
    }
  ) {
    options.logLevel = options.logLevel || LogLevel.info;
    this.logStream = options.logStream || process.stdout;
  }

  public log(entry: LogEntry<any>): boolean | void {
    if (entry.data && entry.data.target && entry.data.target.hidden) {
      return;
    }

    if (entry.data && entry.data.target) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }

      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    if (this.options.logLevel! >= entry.level) {
      if (this.options.grouped && entry.data?.target) {
        return this.logTargetEntryByGroup(entry);
      }

      return this.logTargetEntry(entry);
    }
  }

  protected logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>): boolean | void {
    const colorFn = colors[entry.level];
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { target, hash, duration } = data;
      const { packageName, task } = target;

      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);

      const pkgTask = this.options.grouped ? `${chalk.magenta(packageName)} ${chalk.cyan(task)}` : "";

      switch (data.status) {
        case "running":
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.ok("➔")} start ${pkgTask}`)));

        case "success":
          return this.logStream.write(
            format(
              entry.level,
              normalizedArgs.prefix,
              colorFn(`${colors.ok("✓")} done ${pkgTask} - ${formatDuration(hrToSeconds(duration!))}`)
            )
          );

        case "failed":
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.error("✖")} fail ${pkgTask}`)));

        case "skipped":
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.ok("»")} skip ${pkgTask} - ${hash!}`)));

        case "aborted":
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.warn("-")} aborted ${pkgTask}`)));

        case "queued":
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.warn("…")} queued ${pkgTask}`)));
      }
    } else if (entry?.data?.target) {
      const { target } = data;
      const { packageName, task } = target;
      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);
      return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn("|  " + normalizedArgs.message)));
    } else if (entry?.msg.trim() !== "") {
      return this.logStream.write(format(entry.level, "", entry.msg));
    }
  }

  private logTargetEntryByGroup(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data!;

    const target = data.target;
    const { id } = target;

    this.groupedEntries.set(id, this.groupedEntries.get(id) || []);
    this.groupedEntries.get(id)?.push(entry);

    if (isTargetStatusLogEntry(data)) {
      if (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted") {
        const { status, duration } = data;
        this.logStream.write(this.formatGroupStart(data.target.packageName ?? "<root>", data.target.task, status, duration));

        const entries = this.groupedEntries.get(id)! as LogEntry<TargetStatusEntry>[];
        for (const targetEntry of entries) {
          this.logTargetEntry(targetEntry);
        }

        this.logStream.write(this.formatGroupEnd());
      }
    }
  }

  public summarize(schedulerRunSummary: SchedulerRunSummary): void {
    const { targetRuns, targetRunByStatus, duration } = schedulerRunSummary;
    const { failed, aborted, skipped, success, pending } = targetRunByStatus;

    const statusColorFn: { [status in TargetStatus]: chalk.Chalk } = {
      success: chalk.greenBright,
      failed: chalk.redBright,
      skipped: chalk.gray,
      running: chalk.yellow,
      pending: chalk.gray,
      aborted: chalk.red,
      queued: chalk.magenta,
    };

    this.writeSummaryHeader();

    if (targetRuns.size > 0) {
      const slowestTargets = slowestTargetRuns([...targetRuns.values()]);

      for (const wrappedTarget of slowestTargets) {
        const colorFn = statusColorFn[wrappedTarget.status];
        const target = wrappedTarget.target;

        this.logStream.write(
          format(
            LogLevel.info,
            getTaskLogPrefix(target.packageName || "[GLOBAL]", target.task),
            colorFn(
              `${wrappedTarget.status}${wrappedTarget.duration ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}` : ""}`
            )
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

    if (failed && failed.length > 0) {
      this.writeFailures(failed, targetRuns);
    }

    this.logStream.write(format(LogLevel.info, "", `Took a total of ${formatDuration(hrToSeconds(duration))} to complete`));
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
