import { getWorkspace } from "../workspace/getWorkspace";
import { logger } from "../logger";
import { Config } from "../types/Config";
import { signal } from "../task/abortSignal";
import { displayReportAndExit } from "../displayReportAndExit";
import { createContext } from "../context";
import { NpmScriptTask } from "../task/NpmScriptTask";
import { Reporter } from "../logger/reporters/Reporter";
import { Pipeline } from "../task/Pipeline";

/**
 * Prepares and runs a pipeline
 * @param cwd 
 * @param config 
 * @param reporters 
 */
export async function run(cwd: string, config: Config, reporters: Reporter[]) {
  const context = createContext(config);
  const workspace = getWorkspace(cwd, config);

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
    const pipeline = new Pipeline(workspace, config);
    await pipeline.run(context);
  } catch (e) {
    logger.error("runTasks: " + (e.stack || e.message || e));
    process.exitCode = 1;
  }

  if (config.profile) {
    try {
      const profileFile = profiler.output();
      logger.info(`runTasks: Profile saved to ${profileFile}`);
    } catch (e) {
      logger.error(`An error occured while trying to write profile: ${e.message}`);
      process.exitCode = 1;
    }
  }

  if (!aborted) {
    displayReportAndExit(reporters, context);
  }
}
