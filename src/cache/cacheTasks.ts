import { RunContext } from "../types/RunContext";
import { getTaskId, getPackageTaskFromId } from "../task/taskId";
import { generateTask } from "../task/generateTask";
import { TaskGraph } from "../types/Task";
import { Config } from "../types/Config";

export const ComputeHashTask = "??computeHash";
export const CacheFetchTask = "??fetch";
export const CachePutTask = "??put";

export function isCacheTask(task: string) {
  return (
    task === ComputeHashTask || task === CacheFetchTask || task === CachePutTask
  );
}

export function generateCacheTasks(taskGraph: TaskGraph) {
  const { tasks, taskDeps } = taskGraph;

  for (const taskId of tasks.keys()) {
    const [pkg, task] = getPackageTaskFromId(taskId);

    if (
      task !== CacheFetchTask &&
      task !== CachePutTask &&
      task !== ComputeHashTask &&
      pkg
    ) {
      const hashTaskId = getTaskId(pkg, ComputeHashTask);
      const fetchTaskId = getTaskId(pkg, CacheFetchTask);
      const putTaskId = getTaskId(pkg, CachePutTask);

      // set up the graph
      taskDeps.push([hashTaskId, fetchTaskId]);
      taskDeps.push([fetchTaskId, taskId]);
      taskDeps.push([taskId, putTaskId]);
    }
  }
}
