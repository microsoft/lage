import type { Readable } from "stream";
import type { IWorker } from "./WorkerQueue.js";

export interface PoolStats {
  maxWorkerMemoryUsage: number; // in bytes
  workerRestarts: number;
}
export interface Pool {
  exec(
    data: unknown,
    weight: number,
    setup?: (worker: IWorker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void,
    abortSignal?: AbortSignal
  ): Promise<unknown>;

  stats(): PoolStats;

  close(): Promise<unknown>;
}
