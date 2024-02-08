import { LogLevel } from "./LogLevel";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  msg: string;
  data?: LogStructuredData;
}

export type LogStructuredData = TaskData | InfoData | GraphData;

export interface TaskData {
  status?: "pending" | "started" | "completed" | "failed" | "skipped";
  package?: string;
  task?: string;
  duration?: string;
  hash?: string | null;
}

export interface GraphData {
  edges?: [string, string][];
}

/**
 * LogStructuredData for the `info` command
 */
export interface InfoData {
  command?: string[];
  scope?: string[];
  packageTasks?: PackageTaskInfo[];
}

/**
 * Only useful for logging purposes for the `info` command
 * Use task-scheduler types for interacting with the pipelines
 */
export interface PackageTaskInfo {
  id: string;
  package?: string;
  task: string;
  command: string[];
  workingDirectory: string;
  dependencies: string[];
  type: "npm-script" | "noop";
}
