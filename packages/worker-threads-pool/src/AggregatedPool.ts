import type { Readable } from "stream";
import type { WorkerOptions } from "worker_threads";
import type { Pool } from "./types/Pool.js";
import type { Logger } from "@lage-run/logger";
import type { IWorker } from "./types/WorkerQueue.js";

import { WorkerPool, WorkerPoolEvents } from "./WorkerPool.js";
import EventEmitter from "events";

interface AggregatedPoolOptions {
  groupBy: (data: any) => string;
  maxWorkersByGroup: Map<string, number>;
  maxWorkers: number;
  script: string;
  workerOptions?: WorkerOptions;
  logger: Logger;
  workerIdleMemoryLimit?: number; // in bytes
}

export class AggregatedPool extends EventEmitter implements Pool {
  readonly groupedPools: Map<string, WorkerPool> = new Map();
  readonly defaultPool: WorkerPool | undefined;

  constructor(private options: AggregatedPoolOptions) {
    super();

    const { maxWorkers, maxWorkersByGroup, script, workerOptions } = options;

    let totalGroupedWorkers = 0;
    for (const [group, groupMaxWorkers] of maxWorkersByGroup.entries()) {
      const pool = new WorkerPool({
        maxWorkers: groupMaxWorkers,
        workerOptions,
        script,
        workerIdleMemoryLimit: options.workerIdleMemoryLimit,
      });
      this.groupedPools.set(group, pool);
      totalGroupedWorkers += groupMaxWorkers;
    }

    if (totalGroupedWorkers > maxWorkers) {
      throw new Error(
        `Total maxWorkers (${totalGroupedWorkers}) configured across all groups exceeds concurrency (${maxWorkers}). Try reducing the maxWorkers, or increasing the --concurrency CLI argument, or separate the tasks to be run`
      );
    }

    const defaultPoolWorkersCount = maxWorkers - totalGroupedWorkers;

    if (defaultPoolWorkersCount > 0) {
      this.defaultPool = new WorkerPool({
        maxWorkers: defaultPoolWorkersCount,
        workerOptions,
        script,
        workerIdleMemoryLimit: options.workerIdleMemoryLimit,
      });
    }

    this.options.logger.verbose(
      `Workers pools created:  ${[...maxWorkersByGroup.entries(), ["default", defaultPoolWorkersCount]]
        .map(([group, count]) => `${group} (${count})`)
        .join(", ")}`
    );

    // Any time the idle event is emitted by any pool, dispatch an aggregated idle event if everything is idle
    const pools = [...this.groupedPools.values(), this.defaultPool];
    pools.forEach((pool) => {
      pool?.on(WorkerPoolEvents.idle, () => {
        if (pools.every((p) => p?.isIdle())) {
          this.emit(WorkerPoolEvents.idle);
        }
      });
    });
  }

  stats() {
    const stats = [...this.groupedPools.values(), this.defaultPool].reduce(
      (acc, pool) => {
        if (pool) {
          const poolStats = pool.stats();
          acc.maxWorkerMemoryUsage = Math.max(acc.maxWorkerMemoryUsage, poolStats.maxWorkerMemoryUsage);
          acc.workerRestarts = acc.workerRestarts + poolStats.workerRestarts;
        }
        return acc;
      },
      { maxWorkerMemoryUsage: 0, workerRestarts: 0 }
    );

    return stats;
  }

  async exec(
    data: Record<string, unknown>,
    weight: number,
    setup?: (worker: IWorker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void,
    abortSignal?: AbortSignal
  ): Promise<unknown> {
    const group = this.options.groupBy(data);
    const pool = this.groupedPools.get(group) ?? this.defaultPool;

    if (!pool) {
      throw new Error(`No pool found to be able to run ${group} tasks, try adjusting the maxWorkers & concurrency values`);
    }

    return pool.exec(data, weight, setup, cleanup, abortSignal);
  }

  async close(): Promise<unknown> {
    const promises = [...this.groupedPools.values(), this.defaultPool].map((pool) => pool?.close());
    return Promise.all(promises);
  }
}
