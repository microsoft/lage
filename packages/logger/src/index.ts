import { Logger } from "./Logger";
import { TaskLogger } from "./TaskLogger";

let logger: Logger;

export function getGlobalLogger() {
  if (!logger) {
    logger = new Logger();
  }

  return logger;
}

export function createTaskLogger(pkg: string, task: string) {
  return new TaskLogger(pkg, task);
}

export type { InfoData } from "./interfaces/InfoData";
export type { LogEntry } from "./interfaces/LogEntry";
export type { LogStructuredData } from "./interfaces/LogStructuredData";
export type { PackageTaskInfo } from "./interfaces/PackageTaskInfo";
export type { Reporter } from "./interfaces/Reporter";
export type { TaskData } from "./interfaces/TaskData";

export { LogLevel } from "./interfaces/LogLevel";