import {
  getScopedPackages,
  getTransitiveDependencies,
  PackageInfos,
  getDependentMap,
  getChangedPackages,
} from "workspace-tools";
import { getTaskId, getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { generateTask } from "./generateTask";
import path from "path";
import {
  ComputeHashTask,
  CachePutTask,
  CacheFetchTask,
} from "../cache/cacheTasks";
import { cosmiconfigSync } from "cosmiconfig";
import logger from "npmlog";

const ConfigModuleName = "lage";

function filterPackages(context: RunContext) {
  const { allPackages, scope, since, deps, root, ignoreGlob } = context;

  let scopes = ([] as string[]).concat(scope);

  let filtered: string[] = [];

  // If NOTHING is specified, use all packages
  if (!scopes && !since) {
    logger.verbose("filterPackages", "scope: all packages");
    filtered = Object.keys(allPackages);
  }

  // If scoped is defined, get scoped packages
  if (scopes && scopes.length > 0) {
    const scoped = getScopedPackages(scopes, allPackages);
    filtered = filtered.concat(scoped);
    logger.verbose("filterPackages", `scope: ${scoped.join(",")}`);
  }

  if (since) {
    const changed = getChangedPackages(root, since || "master", ignoreGlob);
    filtered = filtered.concat(changed);
    logger.verbose("filterPackages", `changed: ${changed.join(",")}`);
  }

  if (deps) {
    filtered = filtered.concat(
      getTransitiveDependencies(filtered, allPackages)
    );
  }

  const unique = new Set(filtered);

  return [...unique];
}

function getPipeline(pkg: string, context: RunContext) {
  const { allPackages, pipeline: defaultPipeline } = context;

  const info = allPackages[pkg];

  const results = cosmiconfigSync(ConfigModuleName).search(
    path.dirname(info.packageJsonPath)
  );

  let pipeline = defaultPipeline;

  if (results && results.config) {
    pipeline = results.config.pipeline;
  }

  return pipeline;
}

/**
 * Gather all the task dependencies defined by the "pipeline" setting, generates a list of edges
 * @param targetTask
 * @param pipeline
 */
function generateTaskDepsGraph(
  targetTask: string,
  pipeline: { [key: string]: string[] }
) {
  const queue = [targetTask];
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
 * identify and create a realized task dependency map (discovering)
 *
 * This function will traverse the package dependency graph, and will end up traverse the task depenendencies within the same package (2 layered traversal)
 */
export function discoverTaskDeps(context: RunContext) {
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

function isValidTaskId(taskId: string, allPackages: PackageInfos) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return (
    taskId === "" ||
    task === "" ||
    [ComputeHashTask, CachePutTask, CacheFetchTask].includes(task) ||
    Object.keys(allPackages[pkg].scripts || {}).includes(task)
  );
}

function createDep(fromTaskId: TaskId, toTaskId: TaskId, context: RunContext) {
  const { tasks, taskDepsGraph, allPackages } = context;

  if (
    !isValidTaskId(fromTaskId, allPackages) ||
    !isValidTaskId(toTaskId, allPackages)
  ) {
    return;
  }

  taskDepsGraph.push([fromTaskId, toTaskId]);
  if (!tasks.get(fromTaskId)) {
    tasks.set(fromTaskId, () => generateTask(fromTaskId, context));
  }

  if (!tasks.get(toTaskId)) {
    tasks.set(toTaskId, () => generateTask(toTaskId, context));
  }
}
