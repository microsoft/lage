import { RunContext } from "../types/RunContext";
import {
  createPipeline,
  TopologicalGraph,
  Task,
  getPackageTaskFromId,
  getTaskId,
} from "@microsoft/task-scheduler";
import { Config } from "../types/Config";
import { Workspace } from "../types/Workspace";
import { Priority } from "../types/Priority";
import { NpmScriptTask } from "./NpmScriptTask";
import { getPipelinePackages } from "./getPipelinePackages";
import { parsePipelineConfig } from "./parsePipelineConfig";

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

  const pipelineConfig = parsePipelineConfig(config.pipeline);

  // Add in the task deps based on package graph
  for (const [taskName, taskDeps] of Object.entries(pipelineConfig.taskDeps)) {
    const { deps, topoDeps } = taskDeps;

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

  // adding specific package task dependencies
  for (const packageTaskDep of pipelineConfig.packageTaskDeps) {
    const from = getPackageTaskFromId(packageTaskDep[0]);
    const to = getPackageTaskFromId(packageTaskDep[1]);
    pipeline.addDep(
      { package: from[0], task: from[1] },
      { package: to[0], task: to[1] }
    );
  }

  await pipeline.go({
    packages: getPipelinePackages(workspace, config),
    tasks: config.command,
  });
}
