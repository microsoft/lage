import { PackageInfos } from "workspace-tools";
import { getPackageTaskFromId } from "./taskId";
import {
  ComputeHashTask,
  CachePutTask,
  CacheFetchTask,
} from "../cache/cacheTasks";
export function isValidTaskId(taskId: string, allPackages: PackageInfos) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return (
    taskId === "" ||
    task === "" ||
    [ComputeHashTask, CachePutTask, CacheFetchTask].includes(task) ||
    Object.keys(allPackages[pkg].scripts || {}).includes(task)
  );
}
