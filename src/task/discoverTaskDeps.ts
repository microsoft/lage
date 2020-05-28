import { getDependentMap } from "workspace-tools";
import { getTaskId, getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { generateTask } from "./generateTask";
import logger from "npmlog";
import { filterPackages } from "./filterPackages";
import { isValidTaskId } from "./isValidTaskId";

function getPipeline(pkg: string, context: RunContext) {
  if (context.packagePipelines.has(pkg)) {
    return context.packagePipelines.get(pkg)!;
  }

  return context.defaultPipeline;
}

/**
 * A function that creates dependency relationship within the context.tasks and context.taskDepsGraph
 * @param fromTaskId
 * @param toTaskId
 * @param context
 */
function createDep(fromTaskId: TaskId, toTaskId: TaskId, context: RunContext) {
  const { tasks, taskDepsGraph, allPackages } = context;

  if (
    !isValidTaskId(fromTaskId, allPackages) ||
    !isValidTaskId(toTaskId, allPackages)
  ) {
    return;
  }

  taskDepsGraph.push([fromTaskId, toTaskId]);
  if (!tasks.has(fromTaskId)) {
    tasks.set(fromTaskId, () => generateTask(fromTaskId, context));
  }

  if (!tasks.has(toTaskId)) {
    tasks.set(toTaskId, () => generateTask(toTaskId, context));
  }
}

/**
 * identify and create a realized task dependency map (discovering)
 *
 * This function will traverse the package-task dependency graph, calling createDeps as appropriate
 */
export function discoverTaskDeps(context: RunContext) {
  logger.verbose("discoverTaskDeps", "Discovering task deps");

  const { allPackages, command } = context;

  const filteredPackages = filterPackages(context);

  // initialize a queue for a breadth first approach
  const traversalQueue: TaskId[] = [];

  for (const pkg of filteredPackages) {
    for (const initialCommand of command) {
      traversalQueue.push(getTaskId(pkg, initialCommand));
    }
  }

  const visited = new Set<TaskId>();
  const dependentMap = getDependentMap(allPackages);

  while (traversalQueue.length > 0) {
    const taskId = traversalQueue.shift()!;
    const [pkg, task] = getPackageTaskFromId(taskId);

    if (!visited.has(taskId)) {
      visited.add(taskId);

      // get pipeline
      const pipeline = getPipeline(pkg, context);

      // establish task graph; push dependents in the traversal queue
      // const depTaskGraph = generateTaskDepsGraph(command, pipeline);
      if (pipeline[task].length > 0) {
        for (const from of pipeline[task]) {
          const to = task;
          const dependentPkgs = dependentMap.get(pkg);
          const toTaskId = getTaskId(pkg, to);

          if (from.startsWith("^") && dependentPkgs !== undefined) {
            // add task dep from all the package deps within repo
            for (const depPkg of dependentPkgs!) {
              const fromTaskId = getTaskId(depPkg, from.slice(1));
              createDep(fromTaskId, toTaskId, context);
              // now push the dependents in the traversal queue
              traversalQueue.push(toTaskId);
            }
          } else {
            const fromTaskId = getTaskId(pkg, from);
            // add task dep from same package
            createDep(fromTaskId, toTaskId, context);
            traversalQueue.push(toTaskId);
          }
        }
      } else {
        const fromTaskId = getTaskId(pkg, "");
        createDep(fromTaskId, taskId, context);
        // do not need to traverse farther because "from" is blank
      }
    }
  }
}
