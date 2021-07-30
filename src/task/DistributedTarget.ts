import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { controller } from "./abortSignal";

import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";
import { CacheOptions } from "../types/CacheOptions";
import { TargetStatus } from "../types/TargetStatus";
import { LoggableTarget } from "../types/PipelineDefinition";
import { PipelineTarget } from "./Pipeline";
import { Config } from "../types/Config";
import Queue from "bee-queue";

export class DistributedTarget implements LoggableTarget {
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
    private config: Config,
    private context: RunContext,
    private workerQueue: Queue
  ) {
    this.status = "pending";
    this.logger = new TaskLogger(target.packageName || "[GLOBAL]", target.packageName ? target.task : target.id);

    this.cacheOptions = {
      ...config.cacheOptions,
      outputGlob: [...(config.cacheOptions.outputGlob || []), ...(target.outputGlob || [])],
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

  async run() {
    const { target, context, config, logger } = this;

    try {
      this.onStart();

      // Wraps with profiler as well as task args
      await context.profiler.run(() => {
        return new Promise<void>((resolve, reject) => {
          const job = this.workerQueue.createJob({
            id: target.id,
          });

          job.on("succeeded", (result) => {
            logger.info("succeeded");
            resolve();
          });

          job.on("failed", (result) => {
            logger.info("failed");
            reject();
          });

          // times out at 1 hour
          job
            .timeout(1000 * 60 * 60)
            .save()
            .then((newJob) => {
              logger.info(`job id: ${newJob.id}`);
            });
        });
      }, target.id);

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
