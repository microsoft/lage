import type { LogStructuredData } from "./interfaces/LogStructuredData.js";
import type { Reporter } from "./interfaces/Reporter.js";
import { LogLevel } from "./interfaces/LogLevel.js";
import { createInterface } from "readline";
import type { LogEntry } from "./interfaces/LogEntry.js";

/** Logger accepting specific structured data */
export class Logger<TLogStructuredData extends LogStructuredData, TSummary> {
  private readonly _reporters: Reporter<TLogStructuredData, TSummary>[] = [];

  public get reporters(): ReadonlyArray<Reporter<TLogStructuredData, TSummary>> {
    return this._reporters;
  }

  /**
   * Log a message with the given level, message, and optional data.
   * @param level The log level to use for this message
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public log(level: LogLevel, msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    const entry: LogEntry<TLogStructuredData | LogStructuredData> = {
      timestamp: Date.now(),
      level,
      msg,
      data: data || otherData ? { ...data, ...otherData } : undefined,
    };

    for (const reporter of this._reporters) {
      reporter.log(entry);
    }
  }

  /**
   * Log an info level message.
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public info(msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    this.log(LogLevel.info, msg, data, otherData);
  }

  /**
   * Log a warn level message.
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public warn(msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    this.log(LogLevel.warn, msg, data, otherData);
  }

  /**
   * Log an error level message.
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public error(msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    this.log(LogLevel.error, msg, data, otherData);
  }

  /**
   * Log a verbose level message.
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public verbose(msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    this.log(LogLevel.verbose, msg, data, otherData);
  }

  /**
   * Log a silly level message.
   * @param msg The log message
   * @param data Structured data in expected format for type safety
   * @param otherData Additional arbitrary structured data to include
   */
  public silly(msg: string, data?: TLogStructuredData, otherData?: LogStructuredData): void {
    this.log(LogLevel.silly, msg, data, otherData);
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

  public addReporter(reporter: Reporter<TLogStructuredData, TSummary>): void {
    this._reporters.push(reporter);
  }

  /** Call `summarize()` for each reporter */
  public summarize(summary: TSummary): void {
    for (const reporter of this._reporters) {
      reporter.summarize(summary);
    }
  }

  /** Call `cleanup()` for each reporter */
  public async cleanup(): Promise<void> {
    for (const reporter of this._reporters) {
      await reporter.cleanup?.();
    }
  }
}
