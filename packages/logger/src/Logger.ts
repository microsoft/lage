import type { LogStructuredData } from "./interfaces/LogStructuredData";
import type { LogEntry } from "./interfaces/LogEntry";
import type { Reporter } from "./interfaces/Reporter";

import { LogLevel } from "./interfaces/LogLevel";

export class Logger<TLogStructuredData extends LogStructuredData = LogStructuredData> {
  reporters: Reporter[] = [];
  logs: LogEntry[] = [];

  log(level: LogLevel, msg: string, data?: TLogStructuredData) {
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

  info(msg: string, data?: TLogStructuredData) {
    this.log(LogLevel.info, msg, data);
  }

  warn(msg: string, data?: TLogStructuredData) {
    this.log(LogLevel.warn, msg, data);
  }

  error(msg: string, data?: TLogStructuredData) {
    this.log(LogLevel.error, msg, data);
  }

  verbose(msg: string, data?: TLogStructuredData) {
    this.log(LogLevel.verbose, msg, data);
  }

  silly(msg: string, data?: TLogStructuredData) {
    this.log(LogLevel.silly, msg, data);
  }

  addReporter(reporter: Reporter) {
    this.reporters.push(reporter);
  }
}
