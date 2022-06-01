import type { LogLevel } from "./LogLevel";
import type { LogStructuredData } from "./LogStructuredData";


export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  msg: string;
  data?: LogStructuredData;
}
