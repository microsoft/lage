import { RunContext } from "../types/RunContext";
import { createPipeline, TopologicalGraph } from "@microsoft/task-scheduler";
import { Config } from "../types/Config";
import { npmTask } from "./npmTask";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import { setTaskLogMaxLengths } from "../logger";
import {
  getScopedPackages,
  getChangedPackages,
  getTransitiveProviders,
} from "workspace-tools";

export async function runTasks(options: {
  graph: TopologicalGraph;
  workspace: Workspace;
  context: RunContext;
  config: Config;
}) {
  const { graph, workspace, context, config } = options;

  let pipeline = createPipeline(graph, {
    // dummy logger for task-scheduler because lage already has logger for its tasks
    logger: {
      error: (_msg) => {},
      log: (_msg) => {},
    },
    exit: (code) => {},
    targetsOnly: config.only,
  });

  const taskNames = Object.keys(config.pipeline);

  for (const [task, taskDeps] of Object.entries(config.pipeline)) {
    const deps = taskDeps.filter((dep) => !dep.startsWith("^"));
    const topoDeps = taskDeps
      .filter((dep) => dep.startsWith("^"))
      .map((dep) => dep.slice(1));

    pipeline = pipeline.addTask({
      name: task,
      deps,
      topoDeps,
      run: async (_location, _stdout, _stderr, pkg) => {
        const scripts = workspace.allPackages[pkg].scripts;
        if (scripts && scripts[task]) {
          return (await npmTask(
            task,
            workspace.allPackages[pkg],
            config,
            context,
            workspace.root
          )) as boolean;
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

  // Set up the longest names of tasks and scripts for nice logging
  setTaskLogMaxLengths(
    Object.keys(workspace.allPackages).reduce(
      (l, pkg) => (l < pkg.length ? pkg.length : l),
      0
    ),
    taskNames.reduce((l, task) => (l < task.length ? task.length : l), 0)
  );

  await pipeline.go({
    packages: filteredPackages,
    tasks: config.command,
  });
}
