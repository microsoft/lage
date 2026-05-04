import type { LogStructuredData } from "./interfaces/LogStructuredData.js";
import { Logger } from "./Logger.js";

export function createLogger<TLogStructuredData extends LogStructuredData, TSummary>(): Logger<TLogStructuredData, TSummary> {
  return new Logger<TLogStructuredData, TSummary>();
}
export default createLogger;

export type { LogEntry } from "./interfaces/LogEntry.js";
export type { Reporter } from "./interfaces/Reporter.js";
export { Logger, type LogStructuredData };
export { LogLevel } from "./interfaces/LogLevel.js";
