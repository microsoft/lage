import type { LogStructuredData } from "./interfaces/LogStructuredData.js";
import { Logger } from "./Logger.js";

export default function createLogger<TLogStructuredData extends LogStructuredData = LogStructuredData>() {
  return new Logger<TLogStructuredData>();
}

export type { LogEntry } from "./interfaces/LogEntry.js";
export type { Reporter } from "./interfaces/Reporter.js";
export type { LogStructuredData };

/** Logger, can be extended to have specific TLogStructuredData generic param */
export { Logger };
export { LogLevel } from "./interfaces/LogLevel.js";
