export type TaskId = string;

export type TaskLogs = Map<TaskId, string[]>;

export type TaskLogger = {
  info: (message: string, ...args: any) => void;
  warn: (message: string, ...args: any) => any;
  error: (message: string, ...args: any) => void;
  verbose: (message: string, ...args: any) => void;
};
