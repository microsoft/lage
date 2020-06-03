import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";

import {
  CacheFetchTask,
  CachePutTask,
  ComputeHashTask,
} from "../cache/cacheTasks";
import { fetchBackfill, putBackfill, computeHash } from "../cache/backfill";
import { npmTask } from "./npmTask";
import { TaskDeps, Tasks } from "../types/Task";
import { Config } from "../types/Config";
import { Workspace } from "../types/Workspace";

const EmptyTask = "";

/**
 * Create task wraps the queueing, returns the promise for completion of the task ultimately
 * @param taskId
 * @param context
 */
export function generateTask(
  taskId: string,
  workspace: Workspace,
  context: RunContext,
  config: Config
) {
  // const [_, task] = getPackageTaskFromId(taskId);
  // // Special case, we use this as a dummy to give tasks with no dependencies to be attached in the graph
  // if (task === EmptyTask) {
  //   return Promise.resolve();
  // }
  // switch (task) {
  //   // case ComputeHashTask:
  //   //   return () => taskWrapper(taskId, computeHash, context);
  //   // case CacheFetchTask:
  //   //   return () => taskWrapper(taskId, fetchBackfill, context);
  //   // case CachePutTask:
  //   //   return () => taskWrapper(taskId, putBackfill, context);
  //   default:
  //     return () => npmTask(taskId, workspace, context, config);
  // }
}

/**
 * Create task wraps the queueing, returns the promise for completion of the task ultimately
 * @param taskId
 * @param context
 */
export function generateNpmTasks(options: {
  workspace: Workspace;
  context: RunContext;
  config: Config;
  taskDeps: TaskDeps;
}) {
  // const { taskDeps, workspace, context, config } = options;
  // const tasks: Tasks = new Map();
  // for (const [fromTaskId, toTaskId] of taskDeps) {
  //   if (!tasks.has(fromTaskId)) {
  //     tasks.set(fromTaskId, () =>
  //       npmTask(fromTaskId, workspace, context, config)
  //     );
  //   }
  //   if (!tasks.has(toTaskId)) {
  //     tasks.set(toTaskId, () => npmTask(toTaskId, workspace, context, config));
  //   }
  // }
  // return tasks;
}
