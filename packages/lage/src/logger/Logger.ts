import { LogEntry, LogStructuredData } from "./LogEntry";
import { LogLevel } from "./LogLevel";
import { Reporter } from "./reporters/Reporter";
import { NpmLogReporter } from "./reporters/NpmLogReporter";

export class Logger {
  static reporters: Reporter[] = [new NpmLogReporter({ logLevel: LogLevel.info })];

  logs: LogEntry[] = [];

  log(level: LogLevel, msg: string, data?: LogStructuredData) {
    const entry = {
      timestamp: Date.now(),
      level,
      msg,
      data,
    };

    this.logs.push(entry);

    for (const reporter of Logger.reporters) {
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
}
