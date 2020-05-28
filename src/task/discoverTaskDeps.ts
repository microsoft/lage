import { getDependentMap } from "workspace-tools";
import { getTaskId } from "./taskId";
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
 * Gather all the task dependencies defined by the "pipeline" setting, generates a list of edges
 * @param targetTask
 * @param pipeline
 */
function generateTaskDepsGraph(
  targetTasks: string[],
  pipeline: { [key: string]: string[] }
) {
  const queue = [...targetTasks];
  const visited = new Set<string>();
  const graph: [string, string][] = [];
  while (queue.length > 0) {
    const task = queue.shift()!;
    if (!visited.has(task)) {
      visited.add(task);

      if (Array.isArray(pipeline[task])) {
        if (pipeline[task].length > 0) {
          for (const depTask of pipeline[task]) {
            graph.push([depTask, task]);
            queue.push(depTask);
          }
        } else {
          graph.push(["", task]);
        }
      }
    }
  }

  return graph;
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
 * This function will traverse the package dependency graph, and will end up traverse the task depenendencies within the same package (2 layered traversal)
 */
export function discoverTaskDeps(context: RunContext) {
  logger.verbose("discoverTaskDeps", "Discovering task deps");

  const { allPackages, command } = context;

  const filteredPackages = filterPackages(context);

  // initialize a queue for a breadth first approach
  const traversalQueue = filteredPackages;
  const visited = new Set<string>();
  const dependentMap = getDependentMap(allPackages);

  while (traversalQueue.length > 0) {
    const pkg = traversalQueue.shift()!;

    if (!visited.has(pkg)) {
      visited.add(pkg);

      // get pipeline
      const pipeline = getPipeline(pkg, context);

      // establish task graph; push dependents in the traversal queue
      const depTaskGraph = generateTaskDepsGraph(command, pipeline);

      for (const [from, to] of depTaskGraph) {
        const dependentPkgs = dependentMap.get(pkg);
        const toTaskId = getTaskId(pkg, to);

        if (from.startsWith("^") && dependentPkgs !== undefined) {
          // add task dep from all the package deps within repo
          for (const depPkg of dependentPkgs!) {
            const fromTaskId = getTaskId(depPkg, from.slice(1));
            createDep(fromTaskId, toTaskId, context);
          }

          // now push the dependents in the traversal queue
          traversalQueue.push(pkg);
        } else {
          const fromTaskId = getTaskId(pkg, from);
          // add task dep from same package
          createDep(fromTaskId, toTaskId, context);
        }
      }
    }
  }
}
