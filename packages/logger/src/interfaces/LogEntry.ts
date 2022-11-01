import type { LogLevel } from "./LogLevel.js";
import type { LogStructuredData } from "./LogStructuredData.js";

export interface LogEntry<TLogStructuredData extends LogStructuredData = LogStructuredData> {
  /** a timestamp of when the log event occurred */
  timestamp: number;

  /** the loglevel, it will be recorded as a number */
  level: LogLevel;

  /** a message that goes along with this event */
  msg: string;

  /** some structured data for this entry */
  data?: TLogStructuredData;
}
