import type { Worker } from "worker_threads";
import type { Readable } from "stream";

export interface PoolStats {
  maxWorkerMemoryUsage: number; // in bytes
  workerRestarts: number;
}
export interface Pool {
  exec(
    data: unknown,
    weight: number,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void,
    abortSignal?: AbortSignal
  ): Promise<unknown>;

  stats(): PoolStats;

  close(): Promise<unknown>;
}
