import { Logger } from "./Logger";
import { TaskData } from "./interfaces/TaskData";

export class TaskLogger {
  logger: Logger;

  constructor(private pkg: string, private task: string) {
    this.logger = new Logger();
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

  getLogs() {
    return this.logger.logs;
  }
}
