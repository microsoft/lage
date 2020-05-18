import { RunContext } from "../types/RunContext";
import pGraph from "p-graph";
import { generateCacheTasks } from "../cache/cacheTasks";
import { reportSummary } from "../logger/reportSummary";

export async function runTasks(context: RunContext) {
  const { command, profiler } = context;

  context.measures.start = process.hrtime();

  console.log(`Executing command "${command}"`);

  generateCacheTasks(context);

  try {
    await pGraph(context.tasks, context.taskDepsGraph).run();
  } catch {
    // passthru - we always want to print out the summary ourselves
  }

  if (context.profile) {
    profiler.output();
  }

  context.measures.duration = process.hrtime(context.measures.start);

  await reportSummary(context);
}
