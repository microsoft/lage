import { formatDuration, hrToSeconds } from "./formatDuration";
import { getPackageAndTask, getTargetId, Target } from "@lage-run/target-graph";
import { LogLevel, LogStructuredData } from "@lage-run/logger";
import chalk from "chalk";
import log from "npmlog";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler";
import { TargetEntry } from "./types/TargetLogEntry";

const maxLengths = {
  pkg: 0,
  task: 0,
};
const colors = {
  info: chalk.white,
  verbose: chalk.gray,
  warn: chalk.white,
  error: chalk.white,
  task: chalk.cyan,
  pkg: chalk.magenta,
  silly: chalk.green,
};

function getTaskLogPrefix(pkg: string, task: string) {
  return `${colors.pkg(pkg.padStart(maxLengths.pkg))} ${colors.task(task.padStart(maxLengths.task))}`;
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

function isTargetLogEntry(data?: LogStructuredData) {
  return data !== undefined && data.target;
}

export class NpmLogReporter implements Reporter {
  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    options.logLevel = options.logLevel || LogLevel.info;
    log.level = LogLevel[options.logLevel];
  }

  log(entry: LogEntry<any>) {
    if (entry.data.target) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }

      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    if (this.options.logLevel! >= entry.level) {
      if (isTargetLogEntry(entry.data) && !this.options.grouped) {
        return this.logTargetEntry(entry);
      } else if (isTargetLogEntry(entry.data) && this.options.grouped) {
        return this.logTargetEntryByGroup(entry);
      } else {
        return this.logGenericEntry(entry);
      }
    }
  }

  private logGenericEntry(entry: LogEntry) {
    const normalizedArgs = normalize(entry.msg);

    const logFn = log[LogLevel[entry.level]];
    const colorFn = colors[LogLevel[entry.level]];

    return logFn(normalizedArgs.prefix, colorFn(normalizedArgs.message));
  }

  private logTargetEntry(entry: LogEntry<TargetEntry>) {
    const logFn = log[LogLevel[entry.level]];
    const colorFn = colors[LogLevel[entry.level]];
    const data = entry.data!;

    if (data.status) {
      const { target, hash, duration } = data;
      const { packageName, task } = target;
      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);
      const pkgTask = this.options.grouped ? `${chalk.magenta(packageName)} ${chalk.cyan(task)}` : "";

      switch (data.status) {
        case "running":
          return logFn(normalizedArgs.prefix, colorFn(`➔ start ${pkgTask}`));

        case "success":
          return logFn(normalizedArgs.prefix, colorFn(`✓ done ${pkgTask} - ${formatDuration(hrToSeconds(duration!))}`));

        case "failed":
          return logFn(normalizedArgs.prefix, colorFn(`✖ fail ${pkgTask}`));

        case "skipped":
          return logFn(normalizedArgs.prefix, colorFn(`» skip ${pkgTask} - ${hash!}`));
      }
    } else {
      const { target } = data;
      const { packageName, task } = target;
      const normalizedArgs = this.options.grouped
        ? normalize(entry.msg)
        : normalize(getTaskLogPrefix(packageName ?? "<root>", task), entry.msg);
      return logFn(normalizedArgs.prefix, colorFn("|  " + normalizedArgs.message));
    }
  }

  private logTargetEntryByGroup(entry: LogEntry<TargetEntry>) {
    const data = entry.data!;
    if (data.status) {
      const target = data.target;
      const { packageName, task, id } = target;

      this.groupedEntries.set(id, this.groupedEntries.get(id) || []);
      this.groupedEntries.get(id)?.push(entry);

      if (data && (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted")) {
        const entries = this.groupedEntries.get(id)! as LogEntry<TargetEntry>[];

        for (const targetEntry of entries) {
          this.logTargetEntry(targetEntry);
        }

        if (entries.length > 2) {
          this.hr();
        }
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

    log.info("", chalk.cyanBright(`🏗 Summary\n`));

    if (targetRuns.size > 0) {
      for (const wrappedTarget of targetRuns.values()) {
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

      log.info(
        "",
        `[Tasks Count] success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}`
      );
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
