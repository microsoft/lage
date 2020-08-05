import { RunContext } from "../types/RunContext";
import {
  createPipeline,
  TopologicalGraph,
  Task,
} from "@microsoft/task-scheduler";
import { Config } from "../types/Config";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import {
  getScopedPackages,
  getChangedPackages,
  getTransitiveProviders,
} from "workspace-tools";
import { Priority } from "../types/Priority";
import { NpmScriptTask } from "./NpmScriptTask";
import { getTaskId } from "./taskId";

/** Returns a map that maps task name to the priorities config for that task */
function getPriorityMap(priorities: Priority[]) {
  const result = new Map<string, Task["priorities"]>();

  priorities.forEach((entry) => {
    const taskPriority = result.get(entry.task) || {};
    taskPriority[entry.package] = entry.priority;
    result.set(entry.task, taskPriority);
  });

  return result;
}

export async function runTasks(options: {
  graph: TopologicalGraph;
  workspace: Workspace;
  context: RunContext;
  config: Config;
}) {
  const { graph, workspace, context, config } = options;

  const priorityMap = getPriorityMap(config.priorities);

  let pipeline = createPipeline(graph, {
    // dummy logger for task-scheduler because lage already has logger for its tasks
    logger: {
      error: (_msg) => {},
      log: (_msg) => {},
    },
    exit: (code) => {},
    targetsOnly: config.only,
    concurrency: config.concurrency,
  });

  for (const [taskName, taskDeps] of Object.entries(config.pipeline)) {
    const deps = taskDeps.filter((dep) => !dep.startsWith("^"));
    const topoDeps = taskDeps
      .filter((dep) => dep.startsWith("^"))
      .map((dep) => dep.slice(1));

    pipeline = pipeline.addTask({
      name: taskName,
      deps,
      topoDeps,
      priorities: priorityMap.get(taskName),
      run: async (_location, _stdout, _stderr, pkg) => {
        const info = workspace.allPackages[pkg];
        const scripts = info.scripts;
        if (scripts && scripts[taskName]) {
          const npmTask = new NpmScriptTask(
            taskName,
            workspace.root,
            info,
            config,
            context
          );

          context.tasks.set(getTaskId(info.name, taskName), npmTask);

          return await npmTask.run();
        }
        return true;
      },
    });
  }

  // Filter packages per --scope and command(s)
  const { scope, since } = config;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, workspace.allPackages);
    scopedPackages = [
      ...scopedPackages,
      ...getTransitiveProviders(scopedPackages, workspace.allPackages),
    ];
  }

  const hasSince = typeof since !== "undefined";
  let changedPackages: string[] | undefined = undefined;

  if (hasSince) {
    changedPackages = getChangedPackages(workspace.root, since, config.ignore);
  }

  const filteredPackages = filterPackages({
    allPackages: workspace.allPackages,
    deps: config.deps,
    scopedPackages,
    changedPackages,
  });

  await pipeline.go({
    packages: filteredPackages,
    tasks: config.command,
  });
}
