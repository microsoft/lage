import { formatDuration, hrToSeconds } from "./formatDuration";
import { getPackageAndTask } from "@lage-run/target-graph";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry";
import { LogLevel } from "@lage-run/logger";
import { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry";
import { Writable } from "stream";
import ansiRegex from "ansi-regex";
import chalk from "chalk";
import gradient from "gradient-string";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler";

const colors = {
  [LogLevel.info]: chalk.white,
  [LogLevel.verbose]: chalk.gray,
  [LogLevel.warn]: chalk.white,
  [LogLevel.error]: chalk.hex('#FF1010'),
  [LogLevel.silly]: chalk.green,
  task: chalk.hex('#00DDDD'),
  pkg: chalk.hex('#44FF33'),
  ok: chalk.green,
  error: chalk.red,
  warn: chalk.yellow,
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
  logStream: Writable = process.stdout;
  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    options.logLevel = options.logLevel || LogLevel.info;
  }

  log(entry: LogEntry<any>) {
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
    return this.print(entry.msg);
  }

  private printEntry(entry: LogEntry<any>, message: string) {
    let prefix = "";
    let msg = message;

    if (entry?.data?.target) {
      const { packageName, task } = entry.data.target;
      const normalizedArgs = normalize(getTaskLogPrefix(packageName ?? "<root>", task), msg);
      prefix = normalizedArgs.prefix;
      msg = normalizedArgs.message;
    }

    this.print(`${prefix ? prefix + " " : ""}${msg}`);
  }

  private print(message: string) {
    this.logStream.write(message + "\n");
  }

  private logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const colorFn = colors[entry.level];
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { hash, duration } = data;

      switch (data.status) {
        case "running":
          return this.printEntry(entry, colorFn(`${colors.ok("➔")} start`));

        case "success":
          return this.printEntry(entry, colorFn(`${colors.ok("✓")} done - ${formatDuration(hrToSeconds(duration!))}`));

        case "failed":
          return this.printEntry(entry, colorFn(`${colors.error("✖")} fail`));

        case "skipped":
          return this.printEntry(entry, colorFn(`${colors.ok("»")} skip - ${hash!}`));

        case "aborted":
          return this.printEntry(entry, colorFn(`${colors.warn("»")} aborted`));
      }
    } else {
      return this.printEntry(entry, colorFn(":  " + stripAnsi(entry.msg)));
    }
  }

  private logTargetEntryByGroup(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data!;

    const target = data.target;
    const { id } = target;

    if (
      isTargetStatusLogEntry(data) &&
      (data.status === "success" || data.status === "failed" || data.status === "skipped" || data.status === "aborted")
    ) {
      const entries = this.logEntries.get(id)! as LogEntry<TargetStatusEntry>[];

      for (const targetEntry of entries) {
        this.logTargetEntry(targetEntry);
      }

      if (entries.length > 2) {
        this.hr();
      }
    }
  }

  hr() {
    this.print("┈".repeat(80));
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
    };

    if (targetRuns.size > 0) {
      this.print(chalk.cyanBright(`\nSummary`));

      this.hr();

      for (const wrappedTarget of targetRuns.values()) {
        if (wrappedTarget.target.hidden) {
          continue;
        }

        const colorFn = statusColorFn[wrappedTarget.status] ?? chalk.white;
        const target = wrappedTarget.target;

        this.print(
          `${getTaskLogPrefix(target.packageName || "<root>", target.task)} ${colorFn(
            `${wrappedTarget.status === "running" ? "running - incomplete" : wrappedTarget.status}${
              wrappedTarget.duration ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}` : ""
            }`
          )}`
        );
      }

      this.print(
        `success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`
      );
    } else {
      this.print("Nothing has been run.");
    }

    this.hr();

    if (failed && failed.length > 0) {
      for (const targetId of failed) {
        const { packageName, task } = getPackageAndTask(targetId);
        const failureLogs = this.logEntries.get(targetId);

        this.print(`[${colors.pkg(packageName)} ${colors.task(task)}] ${colors[LogLevel.error]("ERROR DETECTED")}`);

        if (failureLogs) {
          for (const entry of failureLogs) {
            // Log each entry separately to prevent truncation
            this.print(entry.msg);
          }
        }

        this.hr();
      }
    }

    
    const allCacheHits = [...targetRuns.values()].filter((run) => !run.target.hidden).length === skipped.length;
    const allCacheHitText = allCacheHits ? gradient({ r: 237, g: 178, b: 77 }, "cyan")(`All targets skipped!`) : "";

    this.print(`Took a total of ${formatDuration(hrToSeconds(duration))} to complete. ${allCacheHitText}`);
  }
}
