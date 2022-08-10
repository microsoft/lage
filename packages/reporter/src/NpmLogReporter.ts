import { formatDuration, hrToSeconds } from "./formatDuration";
import { getPackageAndTask, getTargetId } from "@lage-run/target-graph";
import { LogLevel } from "@lage-run/logger";
import chalk from "chalk";
import log from "npmlog";
import type { Reporter, LogEntry, LogStructuredData } from "@lage-run/logger";
import type { TargetRunContext, TargetScheduler, TargetStatus } from "@lage-run/scheduler";
import { SchedulerRunSummary } from "@lage-run/scheduler/lib/types/SchedulerRunSummary";

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

// function isTaskData(data?: LogStructuredData): data is TaskData {
//   return data !== undefined && (data as TaskData).task !== undefined;
// }

// function isInfoData(data?: LogStructuredData): data is InfoData {
//   return data !== undefined && (data as InfoData).command !== undefined;
// }

export class NpmLogReporter implements Reporter {
  private logEntries = new Map<string, LogEntry[]>();
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean; npmLoggerOptions?: LoggerOptions }) {
    options.logLevel = options.logLevel || LogLevel.info;
    log.level = LogLevel[options.logLevel];
    log.disp = { ...log.disp, ...options.npmLoggerOptions?.disp };
    log.style = { ...log.style, ...options.npmLoggerOptions?.style };
    log.levels = { ...log.levels, ...options.npmLoggerOptions?.levels };
  }

  log(entry: LogEntry<any>) {
    if (entry.data.target) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }

      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    if (this.options.logLevel! >= entry.level) {
      if (isTaskData(entry.data) && !this.options.grouped) {
        return this.logTaskEntry(entry.data!.package!, entry.data!.task!, entry);
      } else if (isTaskData(entry.data) && this.options.grouped) {
        return this.logTaskEntryInGroup(entry.data!.package!, entry.data!.task!, entry);
      } else if (isInfoData(entry.data)) {
        return this.logInfoEntry(entry);
      } else {
        return this.logGenericEntry(entry);
      }
    }
  }

  private logInfoEntry(entry: LogEntry) {
    const infoData = entry.data as InfoData;
    const logFn = log[LogLevel[entry.level]];
    const colorFn = colors[LogLevel[entry.level]];

    return logFn("", colorFn(JSON.stringify(infoData, null, 2)));
  }

  private logGenericEntry(entry: LogEntry) {
    const normalizedArgs = normalize(entry.msg);

    const logFn = log[LogLevel[entry.level]];
    const colorFn = colors[LogLevel[entry.level]];

    return logFn(normalizedArgs.prefix, colorFn(normalizedArgs.message));
  }

  private logTaskEntry(pkg: string, task: string, entry: LogEntry) {
    const normalizedArgs = this.options.grouped ? normalize(entry.msg) : normalize(getTaskLogPrefix(pkg, task), entry.msg);
    const logFn = log[LogLevel[entry.level]];
    const colorFn = colors[LogLevel[entry.level]];
    const data = entry.data;

    if (data.status) {
      const pkgTask = this.options.grouped ? `${chalk.magenta(pkg)} ${chalk.cyan(task)}` : "";

      switch (data.status) {
        case "started":
          return logFn(normalizedArgs.prefix, colorFn(`➔ start ${pkgTask}`));

        case "completed":
          return logFn(normalizedArgs.prefix, colorFn(`✓ done ${pkgTask} - ${formatDuration(data.duration!)}`));

        case "failed":
          return logFn(normalizedArgs.prefix, colorFn(`✖ fail ${pkgTask}`));

        case "skipped":
          return logFn(normalizedArgs.prefix, colorFn(`» skip ${pkgTask} - ${data.hash!}`));
      }
    } else {
      return logFn(normalizedArgs.prefix, colorFn("|  " + normalizedArgs.message));
    }
  }

  private logTaskEntryInGroup(pkg: string, task: string, logEntry: LogEntry) {
    const taskId = getTargetId(pkg, task);

    this.groupedEntries.set(taskId, this.groupedEntries.get(taskId) || []);
    this.groupedEntries.get(taskId)?.push(logEntry);

    const data = logEntry.data;

    if (data && (data.status === "completed" || data.status === "failed" || data.status === "skipped")) {
      const entries = this.groupedEntries.get(taskId)!;

      for (const entry of entries) {
        this.logTaskEntry(data.package!, data.task!, entry);
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

    // const wrappedTargets = [...runContexts.values()];

    // const failedTargets = wrappedTargets.filter(t => t.status === "failed");
    // const successfulTasks = wrappedTargets.filter((t) => t.status === "success");
    // const skippedTasks = wrappedTargets.filter((t) => t.status === "skipped");
    // const abortedTasks = wrappedTargets.filter((t) => t.status === "aborted");

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

    if (runContexts.size > 0) {
      for (const wrappedTarget of runContexts.values()) {
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
        `[Tasks Count] success: ${successfulTasks.length}, skipped: ${skippedTasks.length}, incomplete: ${
          runContexts.size - successfulTasks.length - skippedTasks.length
        }, aborted: ${abortedTasks.length}`
      );
    } else {
      log.info("", "Nothing has been run.");
    }

    hr();

    if (failedTargets && failedTargets.length > 0) {
      for (const failedTarget of failedTargets) {
        const { packageName, task } = getPackageAndTask(failedTarget.target.id);
        const taskLogs = runContexts.get(failedTarget.target.id)?.logger.getLogs();

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

    // TODO: get total duration somehow
    // log.info("", `Took a total of ${formatDuration(hrToSeconds(measures.duration))} to complete`);
  }
}
