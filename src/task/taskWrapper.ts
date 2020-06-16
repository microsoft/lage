import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { formatDuration } from "../logger/formatDuration";
import { taskLogger } from "../logger";
import { RunContext } from "../types/RunContext";
import { Config } from "../types/Config";
import { PackageInfo } from "workspace-tools";
import { controller } from "./abortSignal";

export async function taskWrapper(
  info: PackageInfo,
  task: string,
  fn: () => Promise<unknown>,
  config: Config,
  context: RunContext,
  root: string
): Promise<unknown> {
  const { profiler, measures } = context;
  const pkg = info.name;
  const logger = taskLogger(pkg, task);
  const start = process.hrtime();

  let cacheHit = false;
  let hash: string | null = null;

  if (config.cache) {
    hash = await cacheHash(task, info, root, config);

    if (hash && !config.resetCache) {
      cacheHit = await cacheFetch(hash, info, config);
    }

    logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`);
  }

  if (!cacheHit) {
    logger.info("▶️ start");

    try {
      const result = await profiler.run(() => fn(), `${pkg}.${task}`);
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
        logger.verbose(`hash put ${hash}`);
        await cachePut(hash, info, config);
      }

      return true;
    } catch (e) {
      handleFailure();
      return false;
    }
  } else {
    const duration = process.hrtime(start);
    measures.taskStats.push({ pkg, task, start, duration, status: "skipped" });
    logger.info("⏭️ skip");
    return true;
  }

  function handleFailure() {
    logger.info("❌ fail");
    if (!measures.failedTask) {
      measures.failedTask = { pkg, task };
    }
    const duration = process.hrtime(start);
    measures.taskStats.push({ pkg, task, start, duration, status: "failed" });
    controller.abort();
  }
}
