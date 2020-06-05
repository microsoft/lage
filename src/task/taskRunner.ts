import { RunContext } from "../types/RunContext";
import { createPipeline, TopologicalGraph } from "@microsoft/task-scheduler";
import { Config } from "../types/Config";
import { npmTask } from "./npmTask";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import { setTaskLogMaxLengths } from "../logger";
import {
  CacheHashTask,
  CachePutTask,
  CacheFetchTask,
} from "../cache/cacheTasks";

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
  });

  const taskNames = Object.keys(config.pipeline);

  // // After all the npm tasks are added, add the cache put task
  // pipeline = pipeline.addTask({
  //   name: CacheHashTask,
  //   run: async (_location, _stdout, _stderr, pkg) => {
  //     await cacheHash(workspace.allPackages[pkg], config);
  //     return true;
  //   },
  // });

  // pipeline = pipeline.addTask({
  //   name: CacheFetchTask,
  //   deps: [CacheHashTask],
  //   run: async (_location, _stdout, _stderr, pkg) => {
  //     await cacheFetch(workspace.allPackages[pkg], config);
  //     return true;
  //   },
  // });

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
        await npmTask(task, workspace.allPackages[pkg], config, context);
        return true;
      },
    });
  }

  // After all the npm tasks are added, add the cache put task
  // pipeline = pipeline.addTask({
  //   name: CachePutTask,
  //   deps: config.command,
  //   run: async (_location, _stdout, _stderr, pkg) => {
  //     const failedStats = context.measures.taskStats.some(
  //       (s) => s.pkg === pkg && s.status === "failed"
  //     );

  //     if (!failedStats) {
  //       await cachePut(workspace.allPackages[pkg], config);
  //     }

  //     return true;
  //   },
  // });

  // Filter packages per --scope and command(s)
  const filteredPackages = filterPackages({
    root: workspace.root,
    allPackages: workspace.allPackages,
    deps: config.deps,
    scope: config.scope,
    since: config.since,
    ignore: config.ignore,
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
    tasks: config.cache ? [...config.command, CachePutTask] : config.command,
  });
}
