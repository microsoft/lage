import type { LogLevel } from "./LogLevel.js";
import type { LogStructuredData } from "./LogStructuredData.js";

export interface LogEntry<TLogStructuredData extends LogStructuredData> {
  /** a timestamp of when the log event occurred */
  timestamp: number;

  /**
   * Log level (recorded as a number). A higher number means a more verbose log,
   * so an entry is shown if the reporter's log level is \>= the entry's level.
   */
  level: LogLevel;

  /** a message that goes along with this event */
  msg: string;

  /** some structured data for this entry */
  data?: TLogStructuredData;
}
