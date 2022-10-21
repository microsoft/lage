import type { AbortSignal } from "abort-controller";
import type { Readable } from "stream";
import type { Worker, WorkerOptions } from "worker_threads";
import type { Pool } from "./types/Pool";
import { Logger } from "@lage-run/logger";

import { WorkerPool } from "./WorkerPool";

interface AggregatedPoolOptions {
  groupBy: (data: any) => string;
  maxWorkersByGroup: Map<string, number>;
  maxWorkers: number;
  script: string;
  workerOptions?: WorkerOptions;
  logger: Logger;
}

export class AggregatedPool implements Pool {
  readonly groupedPools: Map<string, WorkerPool> = new Map();
  readonly defaultPool: WorkerPool;

  constructor(private options: AggregatedPoolOptions) {
    const { maxWorkers, maxWorkersByGroup, script, workerOptions } = options;

    let totalGroupedWorkers = 0;
    for (const [group, groupMaxWorkers] of maxWorkersByGroup.entries()) {
      const pool = new WorkerPool({ maxWorkers: groupMaxWorkers, workerOptions, script });
      this.groupedPools.set(group, pool);
      totalGroupedWorkers += groupMaxWorkers;
    }

    if (totalGroupedWorkers > maxWorkers) {
      throw new Error(
        `Total maxWorkers (${totalGroupedWorkers}) configured across all groups exceeds concurrency (${maxWorkers}). Hint: use percent of concurrency to configure the maxWorkers like this: { maxWorkers: "50%" }`
      );
    }

    const defaultPoolWorkersCount = maxWorkers - totalGroupedWorkers;
    this.defaultPool = new WorkerPool({ maxWorkers: defaultPoolWorkersCount, workerOptions, script });

    this.options.logger.verbose(
      `Workers pools created:  ${[...maxWorkersByGroup.entries()]
        .map(([group, count]) => `${group} (${count})`)
        .join(", ")}, default (${defaultPoolWorkersCount})`
    );
  }

  async exec(
    data: unknown,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void,
    abortSignal?: AbortSignal
  ): Promise<unknown> {
    const group = this.options.groupBy(data);
    const pool = this.groupedPools.get(group) ?? this.defaultPool;
    return pool.exec(data, setup, cleanup, abortSignal);
  }

  async close(): Promise<unknown> {
    const promises = [...this.groupedPools.values(), this.defaultPool].map((pool) => pool?.close());
    return Promise.all(promises);
  }
}
