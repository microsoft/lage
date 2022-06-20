import { Logger } from "./Logger";
import { TaskData } from "./LogEntry";
import { createInterface } from "readline";
import { LogLevel } from "./LogLevel";

export class TaskLogger {
  logger: Logger;

  constructor(private pkg: string, private task: string) {
    this.logger = new Logger();
  }

  log(level: LogLevel, msg: string, data?: TaskData) {
    this.logger.log(level, msg, {
      package: this.pkg,
      task: this.task,
      ...data,
    });
  }

  info(msg: string, data?: TaskData) {
    this.logger.info(msg, { package: this.pkg, task: this.task, ...data });
  }

  warn(msg: string, data?: TaskData) {
    this.logger.warn(msg, { package: this.pkg, task: this.task, ...data });
  }

  error(msg: string, data?: TaskData) {
    this.logger.error(msg, { package: this.pkg, task: this.task, ...data });
  }

  verbose(msg: string, data?: TaskData) {
    this.logger.verbose(msg, { package: this.pkg, task: this.task, ...data });
  }

  silly(msg: string, data?: TaskData) {
    this.logger.silly(msg, { package: this.pkg, task: this.task, ...data });
  }

  stream(level: LogLevel, input: NodeJS.ReadableStream, data?: TaskData) {
    const readline = createInterface({
      input,
      crlfDelay: Infinity,
    });
    readline.on("line", (line) => this.log(level, line, data));
  }

  getLogs() {
    return this.logger.logs;
  }
}
