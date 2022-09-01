import { AbortSignal } from "abort-controller";
import { Logger, LogLevel } from "@lage-run/logger";

import { TargetCaptureStreams, TargetRunner } from "../types/TargetRunner";
import { getPackageAndTask, Target, TargetConfig } from "@lage-run/target-graph";
import type { WorkerPool, WorkerPoolOptions } from "workerpool";
import workerpool from "workerpool";

export interface WorkerRunnerOptions {
  logger: Logger;
  workerTargetConfigs: Record<string, TargetConfig>;
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
 * {
 *   pipeline: {
 *     "lint": {
 *       type: "worker",
 *       worker: "workers/lint.js",
 *       options: {
 *         maxWorkers: 15,
 *         minWorkers: 2,
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class WorkerRunner implements TargetRunner {
  static register(methods?: { [k: string]: (...args: any[]) => any }) {
    workerpool.worker(methods);
  }

  private workerPools: { [poolId: string]: WorkerPool } = {};

  constructor(private options: WorkerRunnerOptions) {}

  private createOrGetPool(target: Target) {
    const { task } = target;
    const { workerTargetConfigs } = this.options;

    let poolId: string = "";
    let poolOptions: WorkerPoolOptions = {};
    let workerScript: string="";

    if (workerTargetConfigs[target.id]) {
      poolId = target.id;
      workerScript = workerTargetConfigs[target.id].options?.worker;
      poolOptions = workerTargetConfigs[target.id].options ?? {};
    } else if (workerTargetConfigs[task]){
      poolId = task;
      workerScript = workerTargetConfigs[task].options?.worker;
      poolOptions = workerTargetConfigs[task].options ?? {};
    }

    if (!this.workerPools[poolId]) {
      this.workerPools[poolId] = workerpool.pool(workerScript, poolOptions);
    }

    return this.workerPools[poolId];
  }

  async run(target: Target, abortSignal?: AbortSignal) {
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
      };

      abortSignal.addEventListener("abort", abortSignalHandler);
    }

    const pool = this.createOrGetPool(target);
    return await pool.exec("run", [target, abortSignal]);
  }

  async cleanup() {
    await Promise.all(Object.values(this.workerPools).map((pool) => pool.terminate()));
  }
}
