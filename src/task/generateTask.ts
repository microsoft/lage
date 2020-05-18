import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";

import {
  CacheFetchTask,
  CachePutTask,
  ComputeHashTask,
} from "../cache/cacheTasks";
import { fetchBackfill, putBackfill, computeHash } from "../cache/backfill";
import { npmTask } from "./npmTask";
import { taskWrapper } from "./taskWrapper";

const EmptyTask = "";

/**
 * Create task wraps the queueing, returns the promise for completion of the task ultimately
 * @param taskId
 * @param context
 */
export function generateTask(taskId: string, context: RunContext) {
  const [_, task] = getPackageTaskFromId(taskId);

  // Special case, we use this as a dummy to give tasks with no dependencies to be attached in the graph
  if (task === EmptyTask) {
    return Promise.resolve();
  }

  switch (task) {
    case ComputeHashTask:
      return taskWrapper(taskId, computeHash, context);

    case CacheFetchTask:
      return taskWrapper(taskId, fetchBackfill, context);

    case CachePutTask:
      return taskWrapper(taskId, putBackfill, context);

    default:
      return npmTask(taskId, context);
  }
}
