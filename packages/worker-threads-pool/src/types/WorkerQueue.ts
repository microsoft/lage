import type { ResourceLimits, Worker } from "worker_threads";
import type { Readable } from "stream";
import type EventEmitter from "events";

export interface QueueItem {
  setup?: (worker: IWorker, stdout: Readable, stderr: Readable) => void;
  cleanup?: (worker: IWorker) => void;
  task: Record<string, unknown>;
  weight: number;
  priority?: number;
  resolve: (value?: unknown) => void;
  reject: (reason: unknown) => void;
}

export interface IWorker extends EventEmitter {
  start(work: QueueItem, abortSignal?: AbortSignal): void;
  stdout: Readable;
  stderr: Readable;
  resourceLimits?: ResourceLimits;
  threadId: number;
  terminate(): void;
  restart(): void;
  weight: number;
  status: "free" | "busy";
  maxWorkerMemoryUsage: number;
  restarts: number;
  postMessage: Worker["postMessage"];
}
