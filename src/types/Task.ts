export type TaskId = string;

/** subject, dependent (e.g. [from, to]) */
export type TaskDeps = [TaskId, TaskId][];

export type Tasks = Map<TaskId, (TaskId) => Promise<unknown>>;

export interface TaskGraph {
  taskDeps: TaskDeps;
  tasks: Tasks;
}

export type TaskLogs = Map<TaskId, string[]>;
export type TaskLogger = {
  info: (message: string, ...args: any) => void;
  warn: (message: string, ...args: any) => any;
  error: (message: string, ...args: any) => void;
  verbose: (message: string, ...args: any) => void;
};
