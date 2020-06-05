import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { formatDuration } from "../logger/formatDuration";
import { taskLogger } from "../logger";
import { RunContext } from "../types/RunContext";
import { Config } from "../types/Config";
import { PackageInfo } from "workspace-tools";

export async function taskWrapper(
  info: PackageInfo,
  task: string,
  fn: () => Promise<void>,
  config: Config,
  context: RunContext
) {
  const { profiler, measures } = context;
  const pkg = info.name;
  const logger = taskLogger(pkg, task);
  const start = process.hrtime();

  let cacheHit = true;
  let hash: string | null = null;

  if (config.cache) {
    hash = await cacheHash(task, info, config);

    if (hash) {
      cacheHit = await cacheFetch(hash, info, config);
    }
  }

  if (!cacheHit) {
    logger.info("▶️ start");

    try {
      await profiler.run(() => fn(), `${pkg}.${task}`);
      const duration = process.hrtime(start);

      measures.taskStats.push({
        pkg,
        task,
        start,
        duration,
        status: "success",
      });

      logger.info(`✔️ done - took ${formatDuration(duration)}`);

      if (config.cache && hash) {
        await cachePut(hash, info, config);
      }
    } catch (e) {
      logger.info("❌ fail");
      if (!measures.failedTask) {
        measures.failedTask = { pkg, task };
      }
      const duration = process.hrtime(start);
      measures.taskStats.push({ pkg, task, start, duration, status: "failed" });
      throw e;
    }
  } else {
    const duration = process.hrtime(start);
    measures.taskStats.push({ pkg, task, start, duration, status: "skipped" });
    logger.info("⏭️ skip");
  }
}
