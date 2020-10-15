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

// Create context
export async function run(cwd: string, config: Config, reporters: Reporter[]) {
  const context = createContext(config);
  const workspace = getWorkspace(cwd, config);

  // generate topological graph
  const graph = generateTopologicGraph(workspace);

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
    await runTasks({ graph, workspace, context, config });
  } catch (e) {
    logger.error("runTasks: " + (e.stack || e.message || e));
    throw new Error(e);
  }

  if (config.profile) {
    const profileFile = profiler.output();
    logger.info(`runTasks: Profile saved to ${profileFile}`);
  }

  if (!aborted) {
    displayReportAndExit(reporters, context);
  }
}
