import { TargetRunner } from "@lage-run/runners";
import { Target } from "@lage-run/target-graph";
import { Pool } from "@lage-run/worker-threads-pool";
import { PoolStats } from "@lage-run/worker-threads-pool/lib/types/Pool";

export class InProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  exec({ target }: { target: Target }): Promise<unknown> {
    return this.runner.run({ target, weight: 1 });
  }
  stats(): PoolStats {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  close(): Promise<unknown> {
    return Promise.resolve();
  }
}

export class SingleSchedulePool implements Pool {
  count = 0;
  constructor(private runner: TargetRunner, private concurrency: number) {}
  exec({ target }: { target: Target }): Promise<unknown> {
    if (this.concurrency > this.count) {
      this.count++;
      return this.runner.run({ target, weight: 1 });
    }

    return Promise.reject(new Error("Pool is full"));
  }
  stats(): PoolStats {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  close(): Promise<unknown> {
    return Promise.resolve();
  }
}
