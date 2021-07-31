import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { controller } from "./abortSignal";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";
import { Config } from "../types/Config";
import { getPackageAndTask } from "./taskId";
import { CacheOptions } from "../types/CacheOptions";
import { TargetStatus } from "../types/TargetStatus";
import { LoggableTarget, PipelineTarget } from "../types/PipelineDefinition";

export class WrappedTarget implements LoggableTarget {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  status: TargetStatus;
  logger: TaskLogger;
  cacheOptions: CacheOptions;

  constructor(
    public target: PipelineTarget,
    private root: string,
    private config: Config,
    private context: RunContext
  ) {
    this.status = "pending";
    this.logger = new TaskLogger(target.packageName || "[GLOBAL]", target.packageName ? target.task : target.id);

    this.cacheOptions = {
      ...config.cacheOptions,
      outputGlob: target.outputGlob || config.cacheOptions.outputGlob,
    };

    this.context.targets.set(target.id, this);
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

    const { target, root, config, cacheOptions } = this;

    if (config.cache) {
      hash = await cacheHash(target.id, target.cwd, root, cacheOptions, config.args);

      if (hash && !config.resetCache) {
        cacheHit = await cacheFetch(hash, target.id, target.cwd, cacheOptions);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, target, cacheOptions } = this;
    logger.verbose(`hash put ${hash}`);
    await cachePut(hash, target.cwd, cacheOptions);
  }

  async run() {
    const { target, context, config, logger } = this;

    try {
      const { hash, cacheHit } = await this.getCache();

      const cacheEnabled = target.cache && config.cache && hash && !config.dist;

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
            logger
          });
        } else {
          result = target.run({
            config: this.config,
            cwd: target.cwd,
            options: target.options,
            logger
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
      context.measures.failedTargets = context.measures.failedTargets || [];
      context.measures.failedTargets.push(target.id);

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
