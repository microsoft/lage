import { AbortSignal } from "abort-controller";
import { Logger } from "@lage-run/logger";
import type { Target, TargetConfig } from "@lage-run/target-graph";
import type { TargetRunner } from "../types/TargetRunner";
import type { WorkerPool, WorkerPoolOptions } from "workerpool";
import workerpool from "workerpool";

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
    let poolOptions: WorkerPoolOptions = {};
    let workerScript: string = "";

    if (workerTargetConfigs[target.id]) {
      poolId = target.id;
      workerScript = workerTargetConfigs[target.id].options?.worker;
      poolOptions = workerTargetConfigs[target.id].options ?? {};
    } else if (workerTargetConfigs[task]) {
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
    const { continueOnError } = this.options;
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

    const pool = this.createOrGetPool(target);
    return await pool.exec("run", [target, abortSignal]);
  }

  async cleanup() {
    await Promise.all(Object.values(this.workerPools).map((pool) => pool.terminate()));
  }
}
