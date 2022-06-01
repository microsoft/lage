import { LogStructuredData } from "./interfaces/LogStructuredData";
import { LogEntry } from "./interfaces/LogEntry";
import { LogLevel } from "./interfaces/LogLevel";
import { Reporter } from "./interfaces/Reporter";

export class Logger {
  reporters: Reporter[] = [];
  logs: LogEntry[] = [];

  log(level: LogLevel, msg: string, data?: LogStructuredData) {
    const entry = {
      timestamp: Date.now(),
      level,
      msg,
      data,
    };

    this.logs.push(entry);

    for (const reporter of this.reporters) {
      reporter.log(entry);
    }
  }

  info(msg: string, data?: LogStructuredData) {
    this.log(LogLevel.info, msg, data);
  }

  warn(msg: string, data?: LogStructuredData) {
    this.log(LogLevel.warn, msg, data);
  }

  error(msg: string, data?: LogStructuredData) {
    this.log(LogLevel.error, msg, data);
  }

  verbose(msg: string, data?: LogStructuredData) {
    this.log(LogLevel.verbose, msg, data);
  }

  silly(msg: string, data?: LogStructuredData) {
    this.log(LogLevel.silly, msg, data);
  }

  addReporter(reporter: Reporter) {
    this.reporters.push(reporter);
  }
}
