import { LogLevel } from "./LogLevel";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  msg: string;
  data?: TaskData;
}

export interface TaskData {
  status?: "pending" | "started" | "completed" | "failed" | "skipped";
  package?: string;
  task?: string;
  duration?: string;
}
