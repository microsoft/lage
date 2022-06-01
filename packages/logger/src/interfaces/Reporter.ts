import type { LogLevel } from "./LogLevel";
import type { LogEntry } from "./LogEntry";

export interface Reporter {
  logLevel?: LogLevel;
  log(entry: LogEntry): void;
  summarize<TContext>(context: TContext): void;
}
