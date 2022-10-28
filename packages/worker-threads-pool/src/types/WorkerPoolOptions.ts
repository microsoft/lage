import type { WorkerOptions } from "worker_threads";

export interface WorkerPoolOptions {
  maxWorkers?: number;
  script: string;
  workerIdleMemoryLimit?: number; // in bytes
  workerOptions?: WorkerOptions;
}
