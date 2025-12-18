import { TargetRunner } from "@lage-run/scheduler-types";
import { Target } from "@lage-run/target-graph";
import { Pool } from "@lage-run/worker-threads-pool";

export class InProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  exec({ target }: { target: Target }) {
    return this.runner.run({ target, weight: 1 });
  }
  stats() {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  close() {
    return Promise.resolve();
  }
}

export class SingleSchedulePool implements Pool {
  count = 0;
  constructor(
    private runner: TargetRunner,
    private concurrency: number
  ) {}
  exec({ target }: { target: Target }) {
    if (this.concurrency > this.count) {
      this.count++;
      return this.runner.run({ target, weight: 1 });
    }

    return Promise.reject(new Error("Pool is full"));
  }
  stats() {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  close() {
    return Promise.resolve();
  }
}
