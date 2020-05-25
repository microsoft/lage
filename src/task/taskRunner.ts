import { RunContext } from "../types/RunContext";
import pGraph from "p-graph";
import { generateCacheTasks } from "../cache/cacheTasks";
import { reportSummary } from "../logger/reportSummary";
import log from "npmlog";

export async function runTasks(context: RunContext) {
  const { profiler } = context;

  context.measures.start = process.hrtime();

  generateCacheTasks(context);

  try {
    await pGraph(context.tasks, context.taskDepsGraph).run();
  } catch {
    // passthru - we always want to print out the summary ourselves
  }

  if (context.profile) {
    const profileFile = profiler.output();
    log.info("runTasks", `Profile saved to ${profileFile}`);
  }

  context.measures.duration = process.hrtime(context.measures.start);

  await reportSummary(context);

  if (context.measures.failedTask) {
    process.exit(1);
  }
}
