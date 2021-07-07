import { RunContext } from "./types/RunContext";
import { Reporter } from "./logger/reporters/Reporter";
import { DistributedNpmScriptTask } from "./task/DistributedNpmTask";

export function displayReportAndExit(
  reporters: Reporter[],
  context: RunContext
) {
  if (DistributedNpmScriptTask.workerQueue) {
    DistributedNpmScriptTask.workerQueue.close();
  }

  context.measures.duration = process.hrtime(context.measures.start);

  for (const reporter of reporters) {
    reporter.summarize(context);
  }

  if (context.measures.failedTasks && context.measures.failedTasks.length > 0) {
    process.exit(1);
  }
}
