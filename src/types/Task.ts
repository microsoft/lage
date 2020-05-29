export type TaskId = string;

/** subject, dependent (e.g. [from, to]) */
export type TaskDeps = [TaskId, TaskId][];

export type Tasks = Map<TaskId, (TaskId) => Promise<unknown>>;

export interface TaskGraph {
  taskDeps: TaskDeps;
  tasks: Tasks;
}
