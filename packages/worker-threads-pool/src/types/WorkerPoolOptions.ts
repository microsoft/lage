import type { WorkerOptions } from "worker_threads";

export interface WorkerPoolOptions {
  minWorkers?: number;
  maxWorkers?: number;
  script: string;
  workerIdleMemoryLimit?: number; // in bytes
  workerOptions?: WorkerOptions;
}
