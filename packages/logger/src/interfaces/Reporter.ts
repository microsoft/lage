import type { LogLevel } from "./LogLevel";
import type { LogEntry } from "./LogEntry";
import { LogStructuredData } from "./LogStructuredData";

export interface Reporter<
  TLogStructuredData extends LogStructuredData = LogStructuredData
> {
  /** log level, use the LogLevel object */
  logLevel?: LogLevel;

  /** logger forward a structured data via this function */
  log(entry: LogEntry<TLogStructuredData>): void;

  /** renders a summary based on the incoming data */
  summarize<TSummaryData>(context: TSummaryData): void;
}
