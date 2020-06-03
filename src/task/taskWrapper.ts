import { cacheHits } from "../cache/backfill";
import { formatDuration } from "../logger/formatDuration";
import { getTaskId } from "./taskId";
import { info, taskLogger } from "../logger";
import { isCacheTask } from "../cache/cacheTasks";
import { RunContext } from "../types/RunContext";

export async function taskWrapper(
  pkg: string,
  task: string,
  fn: () => Promise<void>,
  context: RunContext
) {
  const { profiler, measures } = context;

  const taskId = getTaskId(pkg, task);
  const logger = taskLogger(pkg, task);

  const start = process.hrtime();

  if (!cacheHits[pkg]) {
    if (!isCacheTask(task)) {
      logger.info("started");
    }

    try {
      await profiler.run(() => fn(), taskId);
      const duration = process.hrtime(start);
      if (!isCacheTask(task)) {
        measures.taskStats.push({ taskId, start, duration, status: "success" });
        info(taskId, `done - took ${formatDuration(duration)}`);
      }
    } catch (e) {
      measures.failedTask = { pkg, task };
      const duration = process.hrtime(start);
      measures.taskStats.push({ taskId, start, duration, status: "failed" });
      throw e;
    }
  } else if (!isCacheTask(task)) {
    const duration = process.hrtime(start);
    measures.taskStats.push({ taskId, start, duration, status: "skipped" });
    info(taskId, "skipped");
  }
}
