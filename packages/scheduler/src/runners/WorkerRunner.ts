import { AbortSignal } from "abort-controller";
import { Logger, LogLevel } from "@lage-run/logger";
import type { Target, TargetConfig } from "@lage-run/target-graph";
import type { TargetCaptureStreams, TargetRunner } from "../types/TargetRunner";
import type { WorkerPool, WorkerPoolOptions } from "workerpool";
import workerpool from "workerpool";
import { Readable, Stream } from "stream";

export interface WorkerRunnerOptions {
  logger: Logger;
  workerTargetConfigs: Record<string, TargetConfig>;
  continueOnError?: boolean;
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
  static register(run: (...args: any[]) => any) {
    workerpool.worker({ run });
  }

  private workerPools: { [poolId: string]: WorkerPool } = {};

  constructor(private options: WorkerRunnerOptions) {}

  private createOrGetPool(target: Target) {
    const { task } = target;
    const { workerTargetConfigs } = this.options;

    let poolId: string = "";
    let workerPoolOptions: Record<string, any> = {};
    let workerScript: string = "";

    if (workerTargetConfigs[target.id]) {
      poolId = target.id;
      workerScript = workerTargetConfigs[target.id].options?.worker;
      workerPoolOptions = workerTargetConfigs[target.id].options ?? {};
    } else if (workerTargetConfigs[task]) {
      poolId = task;
      workerScript = workerTargetConfigs[task].options?.worker;
      workerPoolOptions = workerTargetConfigs[task].options ?? {};
    }

    const { worker, ...poolOptions } = workerPoolOptions;

    if (!this.workerPools[poolId]) {
      this.workerPools[poolId] = workerpool.pool(workerScript, poolOptions);
    }

    return this.workerPools[poolId];
  }

  async run(target: Target, abortSignal?: AbortSignal, captureStreams: TargetCaptureStreams = {}) {
    const { continueOnError, logger } = this.options;
    /**
     * Handling abort signal from the abort controller. Gracefully kills the process,
     * will be handled by exit handler separately to resolve the promise.
     */
    if (abortSignal) {
      if (abortSignal.aborted) {
        return;
      }

      const abortSignalHandler = () => {
        abortSignal.removeEventListener("abort", abortSignalHandler);

        if (!continueOnError) {
          pool.terminate();
        }
      };

      abortSignal.addEventListener("abort", abortSignalHandler);
    }

    let stdout: Readable = process.stdout!;
    let stderr: Readable = process.stderr!;

    // if (captureStreams.stdout) {
    //   stdout = stdout.pipe(captureStreams.stdout);
    // }

    // if (captureStreams.stderr) {
    //   stderr = stderr.pipe(captureStreams.stderr);
    // }

    const pool = this.createOrGetPool(target);

    const workerProxy = await pool.proxy();

    console.log(workerProxy);
    
    await workerProxy.run(target);
    // await pool.exec("run", [target, abortSignal]);

    // if (captureStreams.stdout) {
    //   stdout = stdout.unpipe(captureStreams.stdout);
    // }

    // if (captureStreams.stderr) {
    //   stderr = stderr.unpipe(captureStreams.stderr);
    // }
  }

  async cleanup() {
    await Promise.all(Object.values(this.workerPools).map((pool) => pool.terminate()));
  }
}
