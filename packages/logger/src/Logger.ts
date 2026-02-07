import type { LogStructuredData } from "./interfaces/LogStructuredData.js";
import type { Reporter } from "./interfaces/Reporter.js";
import { LogLevel } from "./interfaces/LogLevel.js";
import { createInterface } from "readline";

export class Logger<TLogStructuredData extends LogStructuredData = LogStructuredData> {
  public readonly reporters: Reporter[] = [];

  public log(level: LogLevel, msg: string, data?: TLogStructuredData): void {
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

  public info(msg: string, data?: TLogStructuredData): void {
    this.log(LogLevel.info, msg, data);
  }

  public warn(msg: string, data?: TLogStructuredData): void {
    this.log(LogLevel.warn, msg, data);
  }

  public error(msg: string, data?: TLogStructuredData): void {
    this.log(LogLevel.error, msg, data);
  }

  public verbose(msg: string, data?: TLogStructuredData): void {
    this.log(LogLevel.verbose, msg, data);
  }

  public silly(msg: string, data?: TLogStructuredData): void {
    this.log(LogLevel.silly, msg, data);
  }

  public stream(level: LogLevel, input: NodeJS.ReadableStream, data?: TLogStructuredData): () => void {
    const readline = createInterface({
      input,
      crlfDelay: Infinity,
      terminal: false,
    });

    const lineLogger = (line: string) => {
      this.log(level, line, data);
    };

    readline.on("line", lineLogger);

    return (): void => {
      readline.off("line", lineLogger);
      readline.close();
    };
  }

  public addReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }
}
