import type { LogLevel } from "./LogLevel.js";
import type { LogEntry } from "./LogEntry.js";
import type { LogStructuredData } from "./LogStructuredData.js";

export interface Reporter<TLogStructuredData extends LogStructuredData, TSummary> {
  /** Log level (use the `LogLevel` object) */
  readonly logLevel?: LogLevel;

  /**
   * The logger forwards structured data via this function.
   *
   * The data will usually be of type `TLogStructuredData`, but may also include arbitrary
   * structured data (verifying the runtime type is the reporter's responsibility).
   */
  log(entry: LogEntry<TLogStructuredData | LogStructuredData>): void;

  /** Renders a summary */
  summarize(summary: TSummary): void;

  /** Gives a reporter an opportunity to clean up any resources */
  cleanup?: () => void | Promise<void>;
}
