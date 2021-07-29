import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { controller } from "./abortSignal";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";
import { PipelineTarget } from "./Pipeline";
import { Config } from "../types/Config";
import { getPackageAndTask } from "./taskId";

export type TaskStatus = "completed" | "failed" | "pending" | "started" | "skipped";

export class WrappedTask {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  status: TaskStatus;
  logger: TaskLogger;

  constructor(
    private target: PipelineTarget,
    private root: string,
    private config: Config,
    private context: RunContext
  ) {
    this.status = "pending";
    this.logger = new TaskLogger(target.packageName || "[GLOBAL]", target.packageName ? target.task : target.id);
  }

  onStart() {
    this.status = "started";
    this.startTime = process.hrtime();
    this.logger.info("started", { status: "started" });
  }

  onComplete() {
    this.status = "completed";
    this.duration = process.hrtime(this.startTime);
    this.logger.info("completed", {
      status: "completed",
      duration: hrToSeconds(this.duration),
    });
  }

  onFail() {
    this.status = "failed";
    this.duration = process.hrtime(this.startTime);
    this.logger.info("failed", {
      status: "failed",
      duration: hrToSeconds(this.duration),
    });
  }

  onSkipped(hash: string | null) {
    this.status = "skipped";
    this.duration = process.hrtime(this.startTime);
    this.logger.info(`skipped`, {
      status: "skipped",
      duration: hrToSeconds(this.duration),
      hash,
    });
  }

  async getCache() {
    let hash: string | null = null;
    let cacheHit = false;

    const { target, root, config } = this;

    if (config.cache) {
      hash = await cacheHash(target.id, target.cwd, root, config.cacheOptions, config.args);

      if (hash && !config.resetCache) {
        cacheHit = await cacheFetch(hash, target.id, target.cwd, config.cacheOptions);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, config, target } = this;
    logger.verbose(`hash put ${hash}`);
    await cachePut(hash, target.cwd, config.cacheOptions);
  }

  async run() {
    const { target, context, config, logger } = this;

    try {
      const { hash, cacheHit } = await this.getCache();

      const cacheEnabled = target.cache && config.cache && hash;

      this.onStart();

      // skip if cache hit!
      if (cacheHit) {
        this.onSkipped(hash);
        return true;
      }

      if (cacheEnabled) {
        logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`);
      }

      // Wraps with profiler as well as task args
      await context.profiler.run(() => {
        let result: Promise<unknown> | void;

        if (target.packageName) {
          result = target.run({
            packageName: target.packageName,
            config: this.config,
            cwd: target.cwd,
            options: target.options,
            taskName: getPackageAndTask(target.id).task,
          });
        } else {
          result = target.run({
            config: this.config,
            cwd: target.cwd,
            options: target.options,
          });
        }

        if (!result || typeof result["then"] !== "function") {
          return Promise.resolve(result);
        }

        return result as Promise<unknown>;
      }, target.id);

      if (cacheEnabled) {
        await this.saveCache(hash);
      }

      this.onComplete();
    } catch (e) {
      context.measures.failedTasks = context.measures.failedTasks || [];

      if (target.packageName) {
        context.measures.failedTasks.push({ pkg: target.packageName, task: target.task });
      } else {
        context.measures.failedTasks.push({ pkg: "[GLOBAL]", task: `${target.task} (${target.id})` });
      }

      this.onFail();

      if (config.continue) {
        return true;
      }

      if (!config.safeExit) {
        controller.abort();
      }
      return false;
    }

    return true;
  }
}
