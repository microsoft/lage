import { LogStructuredData } from "./interfaces/LogStructuredData";
import { Logger } from "./Logger";

export default function createLogger<TLogStructuredData extends LogStructuredData = LogStructuredData>() {
  return new Logger<TLogStructuredData>();
}

export type { LogEntry } from "./interfaces/LogEntry";
export type { Reporter } from "./interfaces/Reporter";
export type { LogStructuredData };

/** Logger, can be extended to have specific TLogStructuredData generic param */
export { Logger };
export { LogLevel } from "./interfaces/LogLevel";