import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry.js";
import type { Writable } from "stream";
import { slowestTargetRuns } from "./slowestTargetRuns.js";

const colors = {
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

function getTaskLogPrefix(pkg: string, task: string) {
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

function format(level: LogLevel, prefix: string, message: string) {
  return `${logLevelLabel[level]}: ${prefix} ${message}\n`;
}

export class AdoReporter implements Reporter {
  logStream: Writable = process.stdout;

  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    options.logLevel = options.logLevel || LogLevel.info;
  }

  log(entry: LogEntry<any>) {
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

  private logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
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
          return this.logStream.write(format(entry.level, normalizedArgs.prefix, colorFn(`${colors.warn("…")} aborted ${pkgTask}`)));
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
        this.logStream.write(
          `##[group] ${colors.pkg(data.target.packageName ?? "<root>")} ${colors.task(data.target.task)} ${status}${
            duration ? `, took ${formatDuration(hrToSeconds(duration))}` : ""
          }\n`
        );
        const entries = this.groupedEntries.get(id)! as LogEntry<TargetStatusEntry>[];

        for (const targetEntry of entries) {
          this.logTargetEntry(targetEntry);
        }

        this.logStream.write(`##[endgroup]\n`);
      }
    }
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

    this.logStream.write(chalk.cyanBright(`##[section]Summary\n`));

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

    if (failed && failed.length > 0) {
      for (const targetId of failed) {
        const target = targetRuns.get(targetId)?.target;

        if (target) {
          const { packageName, task } = target;
          const taskLogs = this.logEntries.get(targetId);

          this.logStream.write(`##[error] [${chalk.magenta(packageName)} ${chalk.cyan(task)}] ${chalk.redBright("ERROR DETECTED")}\n`);

          if (taskLogs) {
            for (const entry of taskLogs) {
              // Log each entry separately to prevent truncation
              this.logStream.write(`##[error] ${entry.msg}\n`);
            }
          }
        }
      }
    }

    this.logStream.write(format(LogLevel.info, "", `Took a total of ${formatDuration(hrToSeconds(duration))} to complete`));
  }
}
