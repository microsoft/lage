import { formatDuration, hrToSeconds } from "./formatDuration";
import { getPackageAndTask } from "@lage-run/target-graph";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import ansiRegex from "ansi-regex";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler";
import { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry";

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

const logLevelEnum = {
  [LogLevel.info]: "info",
  [LogLevel.warn]: "warn",
  [LogLevel.error]: "error",
  [LogLevel.silly]: "silly",
  [LogLevel.verbose]: "verbose",
};

const stripAnsiRegex = ansiRegex();

function getTaskLogPrefix(pkg: string, task: string) {
  return `${colors.pkg(pkg)} ${colors.task(task)}`;
}

function stripAnsi(message: string) {
  return message.replace(stripAnsiRegex, "");
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

export class NpmLogReporter implements Reporter {
  logStream = process.stdout;
  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  private logFns = Object.values(logLevelEnum).reduce((acc, level) => {
    acc[level] = (prefix: string, msg: string) => this.logStream.write(`${prefix} ${msg}\n`);
    return acc;
  }, {} as { [key in keyof typeof LogLevel]: (prefix: string, msg: string) => void });

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    options.logLevel = options.logLevel || LogLevel.info;
  }

  log(entry: LogEntry<any>) {
    if ((entry.data && entry.data.target && entry.data.target.hidden) || this.options.logLevel! < entry.level) {
      return;
    }

    if (this.options.grouped && entry.data && entry.data.target) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }

      this.logEntries.get(entry.data.target.id)!.push(entry);
      return this.logTargetEntryByGroup(entry);
    }

    if (entry.data && entry.data.target) {
      return this.logTargetEntry(entry);
    }

    return this.logGenericEntry(entry);
  }

  private logGenericEntry(entry: LogEntry<any>) {
    this.logFns[logLevelEnum[entry.level]]("", entry.msg);
  }

  private logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const logFn = this.logFns[logLevelEnum[entry.level]];

    const colorFn = colors[entry.level];
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { target, hash, duration } = data;
      const { packageName, task } = target;

      const normalizedArgs = normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);

      const pkgTask = this.options.grouped ? ` ${chalk.magenta(packageName)} ${chalk.cyan(task)}` : "";

      switch (data.status) {
        case "running":
          return logFn(normalizedArgs.prefix, colorFn(`${colors.ok("➔")} start${pkgTask}`));

        case "success":
          return logFn(normalizedArgs.prefix, colorFn(`${colors.ok("✓")} done${pkgTask} - ${formatDuration(hrToSeconds(duration!))}`));

        case "failed":
          return logFn(normalizedArgs.prefix, colorFn(`${colors.error("✖")} fail${pkgTask}`));

        case "skipped":
          return logFn(normalizedArgs.prefix, colorFn(`${colors.ok("»")} skip${pkgTask} - ${hash!}`));

        case "aborted":
          return logFn(normalizedArgs.prefix, colorFn(`${colors.warn("»")} aborted${pkgTask}`));
      }
    } else {
      // this is a target log unrelated to a status
      const { target } = data;
      const { packageName, task } = target;
      const normalizedArgs = normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);

      return logFn(normalizedArgs.prefix, colorFn(":  " + stripAnsi(normalizedArgs.message)));
    }
  }

  private logTargetEntryByGroup(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data!;

    const target = data.target;
    const { id } = target;

    this.groupedEntries.set(id, this.groupedEntries.get(id) || []);
    this.groupedEntries.get(id)?.push(entry);

    if (
      isTargetStatusLogEntry(data) &&
      (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted")
    ) {
      const entries = this.groupedEntries.get(id)! as LogEntry<TargetStatusEntry>[];

      for (const targetEntry of entries) {
        this.logTargetEntry(targetEntry);
      }

      if (entries.length > 2) {
        this.hr();
      }
    }
  }

  hr() {
    this.logFns.info("----------------------------------------------\n");
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    const { hr } = this;

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
    };

    this.logFns.info(chalk.cyanBright(`\nSummary\n`));
    if (targetRuns.size > 0) {
      for (const wrappedTarget of targetRuns.values()) {
        if (wrappedTarget.target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[wrappedTarget.status];
        const target = wrappedTarget.target;

        this.logFns.verbose(
          getTaskLogPrefix(target.packageName || "[GLOBAL]", target.task) +
            colorFn(
              `${wrappedTarget.status === "running" ? "running - incomplete" : wrappedTarget.status}${
                wrappedTarget.duration ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}` : ""
              }`
            )
        );
      }

      this.logFns.info(`success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}`);
    } else {
      this.logFns.info("Nothing has been run.");
    }

    hr();

    if (failed && failed.length > 0) {
      for (const targetId of failed) {
        const { packageName, task } = getPackageAndTask(targetId);
        const taskLogs = this.logEntries.get(targetId);

        this.logFns.error(`[${chalk.magenta(packageName)} ${chalk.cyan(task)}] ${chalk.redBright("ERROR DETECTED")}`);

        if (taskLogs) {
          for (const entry of taskLogs) {
            // Log each entry separately to prevent truncation
            this.logFns.error(entry.msg);
          }
        }

        hr();
      }
    }

    this.logFns.info(`Took a total of ${formatDuration(hrToSeconds(duration))} to complete`);
  }
}
