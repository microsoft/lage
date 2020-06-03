import { RunContext } from "../types/RunContext";
import { createPipeline, TopologicalGraph } from "@microsoft/task-scheduler";
import { Config } from "../types/Config";
import { npmTask } from "./npmTask";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";

export async function runTasks(
  graph: TopologicalGraph,
  workspace: Workspace,
  context: RunContext,
  config: Config
) {
  let pipeline = createPipeline(graph);

  const taskNames = Object.keys(config.pipeline);

  // After all the npm tasks are added, add the cache put task
  pipeline = pipeline.addTask({
    name: "cacheHash",
    run: (location, stdout, stderr) => {
      console.log("hashing");
      return Promise.resolve(true);
    },
  });

  pipeline = pipeline.addTask({
    name: "cacheFetch",
    deps: ["cacheHash"],
    run: (location, stdout, stderr) => {
      console.log("fetching");
      return Promise.resolve(true);
    },
  });

  for (const [task, taskDeps] of Object.entries(config.pipeline)) {
    const deps = taskDeps.filter((dep) => !dep.startsWith("^"));
    const topoDeps = taskDeps
      .filter((dep) => dep.startsWith("^"))
      .map((dep) => dep.slice(1));

    pipeline = pipeline.addTask({
      name: task,
      deps: [...(deps ? deps : []), "cacheFetch"],
      topoDeps,
      run: async (location, stdout, stderr, pkg) => {
        npmTask(task, workspace.allPackages[pkg], context, config);
        return true;
      },
    });
  }

  // After all the npm tasks are added, add the cache put task
  pipeline = pipeline.addTask({
    name: "cachePut",
    deps: taskNames,
    run: (location, stdout, stderr) => {
      console.log("putting");
      return Promise.resolve(true);
    },
  });

  const filteredPackages = filterPackages({
    root: workspace.root,
    allPackages: workspace.allPackages,
    deps: config.deps,
    scope: config.scope,
    since: config.since,
    ignore: config.ignore,
  });

  await pipeline.go({
    packages: filteredPackages,
    tasks: config.command,
  });
}
