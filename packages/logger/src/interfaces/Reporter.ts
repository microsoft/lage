import type { LogLevel } from "./LogLevel.js";
import type { LogEntry } from "./LogEntry.js";
import type { LogStructuredData } from "./LogStructuredData.js";

export interface Reporter<TLogStructuredData extends LogStructuredData = LogStructuredData> {
  /** log level, use the LogLevel object */
  logLevel?: LogLevel;

  /** logger forward a structured data via this function */
  log(entry: LogEntry<TLogStructuredData>): void;

  /** renders a summary based on the incoming data */
  summarize(context: unknown): void;

  /** gives a reporter an opportunity to clean up any resources */
  cleanup?: () => void;
}
