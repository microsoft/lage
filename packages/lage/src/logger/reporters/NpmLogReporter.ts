import log from "npmlog";
import chalk from "chalk";
import { Reporter } from "./Reporter";
import { LogLevel } from "../LogLevel";
import { LogEntry, LogStructuredData, TaskData, InfoData } from "../LogEntry";
import { formatDuration, hrToSeconds } from "./formatDuration";
import { RunContext } from "../../types/RunContext";
import { getPackageAndTask, getTargetId } from "../../task/taskId";
import { LoggerOptions } from "../../types/LoggerOptions";
import { TargetStatus } from "../../types/TargetStatus";

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

function isTaskData(data?: LogStructuredData): data is TaskData {
  return data !== undefined && (data as TaskData).task !== undefined;
}

function isInfoData(data?: LogStructuredData): data is InfoData {
  return data !== undefined && (data as InfoData).command !== undefined;
}

export class NpmLogReporter implements Reporter {
  readonly groupedEntries = new Map<string, LogEntry[]>();

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean; npmLoggerOptions?: LoggerOptions }) {
    options.logLevel = options.logLevel || LogLevel.info;
    log.level = LogLevel[options.logLevel];
    log.disp = { ...log.disp, ...options.npmLoggerOptions?.disp };
    log.style = { ...log.style, ...options.npmLoggerOptions?.style };
    log.levels = { ...log.levels, ...options.npmLoggerOptions?.levels };
  }

  log(entry: LogEntry) {
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
    const data = entry.data as TaskData;

    if (data.status) {
      const pkgTask = this.options.grouped ? `${chalk.magenta(pkg)} ${chalk.cyan(task)}` : "";

      switch (data.status) {
        case "started":
          return logFn(normalizedArgs.prefix, colorFn(`▶️ start ${pkgTask}`));

        case "completed":
          return logFn(normalizedArgs.prefix, colorFn(`✔️ done ${pkgTask} - ${formatDuration(data.duration!)}`));

        case "failed":
          return logFn(normalizedArgs.prefix, colorFn(`❌ fail ${pkgTask}`));

        case "skipped":
          return logFn(normalizedArgs.prefix, colorFn(`⏭️ skip ${pkgTask} - ${data.hash!}`));
      }
    } else {
      return logFn(normalizedArgs.prefix, colorFn("|  " + normalizedArgs.message));
    }
  }

  private logTaskEntryInGroup(pkg: string, task: string, logEntry: LogEntry) {
    const taskId = getTargetId(pkg, task);

    this.groupedEntries.set(taskId, this.groupedEntries.get(taskId) || []);
    this.groupedEntries.get(taskId)?.push(logEntry);

    const data = logEntry.data as TaskData;

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

  summarize(context: RunContext) {
    const { measures, targets } = context;
    const { hr } = this;

    const statusColorFn: {
      [status in TargetStatus]: chalk.Chalk;
    } = {
      completed: chalk.greenBright,
      failed: chalk.redBright,
      skipped: chalk.gray,
      started: chalk.yellow,
      pending: chalk.gray,
    };

    log.info("", chalk.cyanBright(`🏗 Summary\n`));

    if (targets.size > 0) {
      for (const wrappedTarget of targets.values()) {
        const colorFn = statusColorFn[wrappedTarget.status];
        const target = wrappedTarget.target;

        log.verbose(
          "",
          getTaskLogPrefix(target.packageName || "[GLOBAL]", target.task),
          colorFn(
            `${wrappedTarget.status === "started" ? "started - incomplete" : wrappedTarget.status}${
              wrappedTarget.duration ? `, took ${formatDuration(hrToSeconds(wrappedTarget.duration))}` : ""
            }`
          )
        );
      }

      const successfulTasks = [...targets.values()].filter((t) => t.status === "completed");
      const skippedTasks = [...targets.values()].filter((t) => t.status === "skipped");

      log.info(
        "",
        `[Tasks Count] success: ${successfulTasks.length}, skipped: ${skippedTasks.length}, incomplete: ${
          targets.size - successfulTasks.length - skippedTasks.length
        }`
      );
    } else {
      log.info("", "Nothing has been run.");
    }

    hr();

    if (measures.failedTargets && measures.failedTargets.length > 0) {
      for (const failedTargetId of measures.failedTargets) {
        const { packageName, task } = getPackageAndTask(failedTargetId);
        const taskLogs = targets.get(failedTargetId)?.logger.getLogs();

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

    log.info("", `Took a total of ${formatDuration(hrToSeconds(measures.duration))} to complete`);
  }
}
