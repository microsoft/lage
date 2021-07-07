import { RunContext } from "./types/RunContext";
import { Reporter } from "./logger/reporters/Reporter";
import { workerQueue } from "./task/workerQueue";

export function displayReportAndExit(
  reporters: Reporter[],
  context: RunContext
) {
  if (workerQueue) {
    workerQueue.close();
  }

  context.measures.duration = process.hrtime(context.measures.start);

  for (const reporter of reporters) {
    reporter.summarize(context);
  }

  if (context.measures.failedTasks && context.measures.failedTasks.length > 0) {
    process.exit(1);
  }
}
