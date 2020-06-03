import log from "npmlog";
import { getTaskId } from "../task/taskId";
import { Writable } from "stream";
import chalk from "chalk";
import { TaskLogs, TaskLogger } from "../types/Task";

const taskLogs: TaskLogs = new Map();

export function getTaskLogs() {
  return taskLogs;
}

export function getTaskLogPrefix(pkg: string, task: string) {
  return `${pkg} ${chalk.green(task)}`;
}

function addToTaskLog(pkg: string, task: string, message: string) {
  const taskId = getTaskId(pkg, task);

  if (!taskLogs.has(taskId)) {
    taskLogs.set(taskId, []);
  }

  taskLogs.get(taskId)!.push(message);
}

function normalize(prefixOrMessage: string, message?: string, ...args: any) {
  if (arguments.length > 2) {
    const prefix = prefixOrMessage;
    return { prefix, message, args };
  } else {
    const prefix = "";
    const message = prefixOrMessage;
    return { prefix, message, args };
  }
}

export function info(prefixOrMessage: string, message?: string, ...args: any) {
  const normalizedArgs = normalize(prefixOrMessage, message, args);
  return log.info(
    normalizedArgs.prefix,
    chalk.cyan(normalizedArgs.message),
    ...normalizedArgs.args
  );
}

export function warn(prefixOrMessage: string, message?: string, ...args: any) {
  const normalizedArgs = normalize(prefixOrMessage, message, args);
  return log.warn(
    normalizedArgs.prefix,
    chalk.yellow(normalizedArgs.message),
    ...normalizedArgs.args
  );
}

export function error(prefixOrMessage: string, message?: string, ...args: any) {
  const normalizedArgs = normalize(prefixOrMessage, message, args);
  return log.error(
    normalizedArgs.prefix,
    chalk.red(normalizedArgs.message),
    ...normalizedArgs.args
  );
}

export function verbose(
  prefixOrMessage: string,
  message?: string,
  ...args: any
) {
  const normalizedArgs = normalize(prefixOrMessage, message, args);
  return log.verbose(
    normalizedArgs.prefix,
    chalk.magenta(normalizedArgs.message),
    ...normalizedArgs.args
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
            .trim();
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
    info: (message: string, ...args: any) => {
      addToTaskLog(pkg, task, message);
      return log.info(
        getTaskLogPrefix(pkg, task),
        chalk.cyan(message),
        ...args
      );
    },

    warn: (message: string, ...args: any) => {
      addToTaskLog(pkg, task, message);
      return log.warns(
        getTaskLogPrefix(pkg, task),
        chalk.yellow(message),
        ...args
      );
    },

    error: (message: string, ...args: any) => {
      addToTaskLog(pkg, task, message);
      return log.error(
        getTaskLogPrefix(pkg, task),
        chalk.red(message),
        ...args
      );
    },

    verbose: (message: string, ...args: any) => {
      addToTaskLog(pkg, task, message);
      return log.verbose(
        getTaskLogPrefix(pkg, task),
        chalk.magenta(message),
        ...args
      );
    },
  };
}
