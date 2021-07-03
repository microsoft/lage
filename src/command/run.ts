import { getWorkspace } from "../workspace/getWorkspace";
import { logger } from "../logger";
import { Config } from "../types/Config";
import { generateTopologicGraph } from "../workspace/generateTopologicalGraph";
import { signal } from "../task/abortSignal";
import { displayReportAndExit } from "../displayReportAndExit";
import { createContext } from "../context";
import { runTasks } from "../task/taskRunner";
import { NpmScriptTask } from "../task/NpmScriptTask";
import { Reporter } from "../logger/reporters/Reporter";
import { generateTaskGraph } from "@microsoft/task-scheduler";
import { getPipelinePackages } from "../task/getPipelinePackages";
import { Tasks } from "@microsoft/task-scheduler/lib/types";
import { parsePipelineConfig } from "../task/parsePipelineConfig";

// Run multiple
export async function run(cwd: string, config: Config, reporters: Reporter[]) {
  const context = createContext(config);
  const workspace = getWorkspace(cwd, config);
  const tasks: Tasks = new Map();
  const pipelineConfig = parsePipelineConfig(config.pipeline);

  for (const [taskName, taskDeps] of Object.entries(pipelineConfig.taskDeps)) {
    const { deps, topoDeps } = taskDeps;
    tasks.set(taskName, {
      name: taskName,
      run: () => Promise.resolve(true),
      deps,
      topoDeps,
    });
  }

  // generate topological graph
  const graph = generateTopologicGraph(workspace);
  const packages = getPipelinePackages(workspace, config);
  const taskDeps = generateTaskGraph(
    packages,
    config.command,
    tasks,
    graph,
    pipelineConfig.packageTaskDeps,
    false
  );

  const { profiler } = context;

  let aborted = false;

  context.measures.start = process.hrtime();

  // die faster if an abort signal is seen
  signal.addEventListener("abort", () => {
    aborted = true;
    NpmScriptTask.killAllActiveProcesses();
    displayReportAndExit(reporters, context);
  });

  try {
    await runTasks({ graph, workspace, context, config, packageTaskDeps: taskDeps });
  } catch (e) {
    logger.error("runTasks: " + (e.stack || e.message || e));
    process.exitCode = 1;
  }

  if (config.profile) {
    const profileFile = profiler.output();
    logger.info(`runTasks: Profile saved to ${profileFile}`);
  }

  if (!aborted) {
    displayReportAndExit(reporters, context);
  }
}
