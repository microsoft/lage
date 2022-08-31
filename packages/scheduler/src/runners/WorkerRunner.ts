import { AbortSignal } from "abort-controller";
import { Logger, LogLevel } from "@lage-run/logger";

import { TargetCaptureStreams, TargetRunner } from "../types/TargetRunner";
import { getPackageAndTask, Target } from "@lage-run/target-graph";
import type { WorkerPool, WorkerPoolOptions } from "workerpool";
import workerpool from "workerpool";

export interface WorkerRunnerOptions {
  logger: Logger;
  poolOptions: {
    [poolId: string]: WorkerPoolOptions;
  };
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
  private workerPools: { [poolId: string]: WorkerPool } = {};

  constructor(private options: WorkerRunnerOptions) {
    if (!options.poolOptions) {
      throw new Error("WorkerRunner requires poolOptions");
    }
  }

  private createOrGetPool(target: Target) {
    const { packageName, task } = getPackageAndTask(target.id);
    const { poolOptions } = this.options;

    const poolId = poolOptions[task] ? task : poolOptions[target.id] ? target.id : undefined;

    if (!poolId) {
      throw new Error(`No worker pool has been defined for this target: ${target.id}`);
    }

    if (!this.workerPools[poolId]) {
      this.workerPools[poolId] = workerpool.pool(poolOptions[poolId]);
    }
  }

  async run(target: Target, abortSignal?: AbortSignal, captureStreams: TargetCaptureStreams = {}) {
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

    /**
     * Actually spawn the npm client to run the task
     */
    const npmRunArgs = this.getNpmArgs(target.task, taskArgs);
    const npmRunNodeOptions = [nodeOptions, target.options?.nodeOptions].filter((str) => str).join(" ");
  }
}
