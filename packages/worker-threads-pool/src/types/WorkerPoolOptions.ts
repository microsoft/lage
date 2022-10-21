import type { WorkerOptions } from "worker_threads";

export interface WorkerPoolOptions {
  maxWorkers?: number;
  script: string;
  workerOptions?: WorkerOptions;
}
