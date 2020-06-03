import { cacheHits } from "../cache/backfill";
import { formatDuration } from "../logger/formatDuration";
import { getTaskId } from "./taskId";
import { taskLogger } from "../logger";
import { isCacheTask } from "../cache/cacheTasks";
import { RunContext } from "../types/RunContext";

export async function taskWrapper(
  pkg: string,
  task: string,
  fn: () => Promise<void>,
  context: RunContext
) {
  const { profiler, measures } = context;

  const logger = taskLogger(pkg, task);

  const start = process.hrtime();

  if (!cacheHits[pkg]) {
    if (!isCacheTask(task)) {
      logger.info("started");
    }

    try {
      await profiler.run(() => fn(), `${pkg}.${task}`);
      const duration = process.hrtime(start);
      if (!isCacheTask(task)) {
        measures.taskStats.push({
          pkg,
          task,
          start,
          duration,
          status: "success",
        });
        logger.info(`done - took ${formatDuration(duration)}`);
      }
    } catch (e) {
      measures.failedTask = { pkg, task };
      const duration = process.hrtime(start);
      measures.taskStats.push({ pkg, task, start, duration, status: "failed" });
      throw e;
    }
  } else if (!isCacheTask(task)) {
    const duration = process.hrtime(start);
    measures.taskStats.push({ pkg, task, start, duration, status: "skipped" });
    logger.info("skipped");
  }
}
