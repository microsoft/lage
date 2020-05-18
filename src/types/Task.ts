export type TaskId = string;
export type TaskDeps = TaskId[];

/** subject, dependent (e.g. [test, build]) */
export type TaskDepsGraph = [TaskId, TaskId][];

export type Tasks = Map<TaskId, (TaskId) => Promise<unknown>>;
