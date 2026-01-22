import type { LogStructuredData } from "./interfaces/LogStructuredData.js";
import type { Reporter } from "./interfaces/Reporter.js";
import { LogLevel } from "./interfaces/LogLevel.js";
import { createInterface } from "readline";

export class Logger<TLogStructuredData extends LogStructuredData = LogStructuredData> {
  reporters: Reporter[] = [];

  log(level: LogLevel, msg: string, data?: TLogStructuredData) {
    const entry = {
      timestamp: Date.now(),
      level,
      msg,
      data,
    };

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

  stream(level: LogLevel, input: NodeJS.ReadableStream, data?: TLogStructuredData) {
    const readline = createInterface({
      input,
      crlfDelay: Infinity,
      terminal: false,
    });

    const lineLogger = (line: string) => {
      this.log(level, line, data);
    };

    readline.on("line", lineLogger);

    return () => {
      readline.off("line", lineLogger);
      readline.close();
    };
  }

  addReporter(reporter: Reporter) {
    this.reporters.push(reporter);
  }
}
