import log from "npmlog";
import { getTaskId } from "../task/taskId";
import { Writable } from "stream";
import chalk from "chalk";
import { TaskLogs, TaskLogger } from "../types/Task";

const taskLogs: TaskLogs = new Map();

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
};

export function getTaskLogs() {
  return taskLogs;
}

export function setTaskLogMaxLengths(
  maxPkgLength: number,
  maxTaskLength: number
) {
  maxLengths.pkg = maxPkgLength;
  maxLengths.task = maxTaskLength;
}

export function getTaskLogPrefix(pkg: string, task: string) {
  return `${colors.pkg(pkg.padStart(maxLengths.pkg))} ${colors.task(
    task.padStart(maxLengths.task)
  )}`;
}

function addToTaskLog(pkg: string, task: string, message: string) {
  const taskId = getTaskId(pkg, task);

  if (!taskLogs.has(taskId)) {
    taskLogs.set(taskId, []);
  }

  taskLogs.get(taskId)!.push(message);
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

function info(prefixOrMessage: string, message?: string) {
  const normalizedArgs = normalize(prefixOrMessage, message);
  return log.info(normalizedArgs.prefix, colors.info(normalizedArgs.message));
}

function warn(prefixOrMessage: string, message?: string) {
  const normalizedArgs = normalize(prefixOrMessage, message);
  return log.warn(normalizedArgs.prefix, colors.warn(normalizedArgs.message));
}

function error(prefixOrMessage: string, message?: string) {
  const normalizedArgs = normalize(prefixOrMessage, message);
  return log.error(normalizedArgs.prefix, colors.error(normalizedArgs.message));
}

function verbose(prefixOrMessage: string, message?: string, ...args: any) {
  const normalizedArgs = normalize(prefixOrMessage, message);
  return log.verbose(
    normalizedArgs.prefix,
    colors.verbose(normalizedArgs.message)
  );
}

export class NpmLogWritable extends Writable {
  private buffer: string = "";
  private taskLogger: TaskLogger;

  constructor(pkg: string, task: string) {
    super();
    this.taskLogger = taskLogger(pkg, task);
  }

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void
  ) {
    let prev = 0;
    let curr = 0;
    while (curr < chunk.byteLength) {
      if (chunk[curr] === 13 || (chunk[curr] === 10 && curr - prev > 1)) {
        this.buffer =
          this.buffer +
          chunk
            .slice(prev, curr)
            .toString()
            .replace(/[\r\n]+/g, "")
            .trimRight();
        this.taskLogger.verbose(this.buffer);
        this.buffer = "";
        prev = curr;
      }
      curr++;
    }
    callback();
  }
}

export function logLevel(level: "error" | "warn" | "info" | "verbose") {
  log.level = level;
}

export const logger = {
  info,
  warn,
  error,
  verbose,
};

export function taskLogger(pkg, task) {
  return {
    info: (message: string) => {
      addToTaskLog(pkg, task, message);
      return log.info(getTaskLogPrefix(pkg, task), colors.info(message));
    },

    warn: (message: string) => {
      addToTaskLog(pkg, task, message);
      return log.warns(getTaskLogPrefix(pkg, task), colors.warn(message));
    },

    error: (message: string) => {
      addToTaskLog(pkg, task, message);
      return log.error(getTaskLogPrefix(pkg, task), colors.error(message));
    },

    verbose: (message: string) => {
      addToTaskLog(pkg, task, message);
      return log.verbose(getTaskLogPrefix(pkg, task), colors.verbose(message));
    },
  };
}
