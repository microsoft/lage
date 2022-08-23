import { formatDuration, hrToSeconds } from "./formatDuration";
import { getPackageAndTask } from "@lage-run/target-graph";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import log from "npmlog";
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

const logFns = Object.values(logLevelEnum).reduce((acc, level) => {
  acc[LogLevel[level]] = log[level];
  return acc;
}, {});

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

export class NpmLogReporter implements Reporter {
  npmLog = log;
  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    options.logLevel = options.logLevel || LogLevel.info;
    log.level = logLevelEnum[options.logLevel];
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
      if (entry && entry.data && entry.data.target) {
        if (this.options.grouped) {
          return this.logTargetEntryByGroup(entry);
        }

        return this.logTargetEntry(entry);
      }
    }

    return this.logGenericEntry(entry);
  }

  private logGenericEntry(entry: LogEntry<any>) {
    const logFn = logFns[entry.level];
    logFn("", entry.msg);
  }

  private logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const logFn = logFns[entry.level];

    const colorFn = colors[entry.level];
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { target, hash, duration } = data;
      const { packageName, task } = target;

      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);

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
      // this is a generic log
      const { target } = data;
      const { packageName, task } = target;
      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);
      return logFn(normalizedArgs.prefix, colorFn("|  " + normalizedArgs.message));
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
    log.info("", "----------------------------------------------");
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

    log.info("", chalk.cyanBright(`Summary\n`));

    if (targetRuns.size > 0) {
      for (const wrappedTarget of targetRuns.values()) {
        if (wrappedTarget.target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[wrappedTarget.status];
        const target = wrappedTarget.target;

        log.verbose(
          "",
          getTaskLogPrefix(target.packageName || "[GLOBAL]", target.task),
          colorFn(
            `${wrappedTarget.status === "running" ? "running - incomplete" : wrappedTarget.status}${
              wrappedTarget.duration ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}` : ""
            }`
          )
        );
      }

      log.info("", `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}`);
    } else {
      log.info("", "Nothing has been run.");
    }

    hr();

    if (failed && failed.length > 0) {
      for (const targetId of failed) {
        const { packageName, task } = getPackageAndTask(targetId);
        const taskLogs = this.logEntries.get(targetId);

        log.error("", `[${chalk.magenta(packageName)} ${chalk.cyan(task)}] ${chalk.redBright("ERROR DETECTED")}`);

        if (taskLogs) {
          for (const entry of taskLogs) {
            // Log each entry separately to prevent truncation
            log.error("", entry.msg);
          }
        }

        hr();
      }
    }

    log.info("", `Took a total of ${formatDuration(hrToSeconds(duration))} to complete`);
  }
}
