export enum LogLevel {
  error = 10,
  warn = 20,
  info = 30,
  verbose = 40,
  silly = 50,
}


export interface Reporter {
  level: LogLevel;
  log(entry: LogEntry): void;
  summarize<TContext>(context: TContext): void;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  msg: string;
  data?: LogStructuredData;
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
}

export type LogStructuredData = TaskData | InfoData;

export interface TaskData {
  status?: "pending" | "started" | "completed" | "failed" | "skipped";
  package?: string;
  task?: string;
  duration?: string;
  hash?: string | null;
}
