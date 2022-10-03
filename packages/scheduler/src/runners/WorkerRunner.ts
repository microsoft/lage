import { LogLevel } from "@lage-run/logger";
import { WorkerPool } from "@lage-run/worker-threads-pool";
import os from "os";
import type { AbortSignal } from "abort-controller";
import type { Logger } from "@lage-run/logger";
import type { Target, TargetConfig } from "@lage-run/target-graph";
import type { TargetRunner } from "@lage-run/scheduler-types";
import type { Worker } from "worker_threads";
import type { Readable } from "stream";

export interface WorkerRunnerOptions {
  logger: Logger;
  workerTargetConfigs: Record<string, TargetConfig>;
  nodeOptions?: string;
}

export interface PoolOptions {
  id: string;
  options: Record<string, any>;
  script: string;
  nodeOptions: string;
}

/**
 * Creates a workerpool per target task definition of "type: worker"
 *
 * Target options are fed into `workerpool`, so target can customize the pool:
 *
 * https://www.npmjs.com/package/workerpool
 *
 * Example:
 *
 * ```ts
 * // lage.config.js
 * {
 *   pipeline: {
 *     "lint": {
 *       type: "worker",
 *       options: {
 *         worker: "workers/lint.js",
 *         maxWorkers: 15,
 *         minWorkers: 2,
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ```js
 * // worker.js
 * const { WorkerRunner } = require("@lage-run/scheduler");
 * WorkerRunner.register({
 * })
 * ```
 */
export class WorkerRunner implements TargetRunner {
  private pools: Record<string, WorkerPool> = {};

  static gracefulKillTimeout = 2500;

  constructor(private options: WorkerRunnerOptions) {}

  getPoolOptions(target: Target): PoolOptions {
    const { task } = target;
    const { workerTargetConfigs } = this.options;

    let id = "";
    let options: Record<string, any> = {};
    let script = "";

    if (workerTargetConfigs[target.id]) {
      id = target.id;
      script = workerTargetConfigs[target.id].options?.worker;
      options = workerTargetConfigs[target.id].options ?? {};
    } else if (workerTargetConfigs[task]) {
      id = task;
      script = workerTargetConfigs[task].options?.worker;
      options = workerTargetConfigs[task].options ?? {};
    }

    return {
      id,
      script,
      options,
      nodeOptions: workerTargetConfigs[id].options?.nodeOptions,
    };
  }

  ensurePool(poolOptions: PoolOptions) {
    const { id, script, options } = poolOptions;

    if (!this.pools[id]) {
      const pool = new WorkerPool({
        maxWorkers: options.maxWorkers ?? os.cpus().length,
        script,
        workerOptions: {
          stdout: true,
          stderr: true,
        },
      });

      this.pools[id] = pool;
    }

    return this.pools[id];
  }

  captureStream(target: Target, _worker?: Worker, stdout?: Readable, stderr?: Readable) {
    const { logger } = this.options;

    const onData = (data: string) => logger.log(LogLevel.info, data, { target });

    if (stdout) {
      stdout.setEncoding("utf-8");
      stdout.on("data", onData);
    }

    if (stderr) {
      stderr.setEncoding("utf-8");
      stderr.on("data", onData);
    }

    return () => {
      if (stdout) {
        stdout.off("data", onData);
      }

      if (stderr) {
        stderr.off("data", onData);
      }
    };
  }

  async run(target: Target, abortSignal?: AbortSignal) {
    if (abortSignal) {
      if (abortSignal.aborted) {
        return;
      }

      const abortSignalHandler = () => {
        abortSignal.removeEventListener("abort", abortSignalHandler);
        this.cleanup();
      };

      abortSignal.addEventListener("abort", abortSignalHandler);
    }

    const poolOptions = this.getPoolOptions(target);
    const pool = this.ensurePool(poolOptions);
    let cleanupStreams: () => void;

    await pool.exec(
      { target },
      (worker, stdout, stderr) => {
        cleanupStreams = this.captureStream(target, worker, stdout, stderr);
      },
      () => {
        cleanupStreams();
      }
    );
  }

  async cleanup() {
    for (const pool of Object.values(this.pools)) {
      await pool.close();
    }
  }
}
