import log from "npmlog";
import { getPackageTaskFromId } from "../task/taskId";
import { RunContext } from "../types/RunContext";
import { Writable } from "stream";
import chalk from "chalk";

let _context: RunContext;

export function initLogger(context: RunContext) {
  _context = context;
}

export function getTaskLogPrefix(taskId: string) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return `${pkg} ${chalk.green(task)}`;
}

function addToTaskLog(taskId: string, message: string) {
  const { taskLogs } = _context;
  if (!taskLogs.has(taskId)) {
    taskLogs.set(taskId, []);
  }

  taskLogs.get(taskId)?.push(message);
}

export function info(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.info(getTaskLogPrefix(taskId), chalk.cyan(message), ...args);
}

export function warn(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.warns(getTaskLogPrefix(taskId), chalk.yellow(message), ...args);
}

export function error(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.error(getTaskLogPrefix(taskId), chalk.red(message), ...args);
}

export function verbose(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.verbose(
    getTaskLogPrefix(taskId),
    chalk.underline(message),
    ...args
  );
}

export class NpmLogWritable extends Writable {
  private buffer: string = "";

  constructor(private taskId: string) {
    super();
  }

  _write(
    chunk: Buffer,
    encoding: string,
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
        addToTaskLog(this.taskId, this.buffer);
        log.verbose(getTaskLogPrefix(this.taskId), this.buffer);
        this.buffer = "";
        prev = curr;
      }
      curr++;
    }
    callback();
  }
}

export default { info, warn, error, verbose };
