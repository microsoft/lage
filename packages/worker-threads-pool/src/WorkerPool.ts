import { EventEmitter } from "events";
import { IWorker, QueueItem } from "./types/WorkerQueue.js";
import { ThreadWorker } from "./ThreadWorker.js";
import os from "os";
import type { Pool } from "./types/Pool.js";
import type { Readable } from "stream";
import type { WorkerPoolOptions } from "./types/WorkerPoolOptions.js";

const workerFreedEvent = "free";

export class WorkerPool extends EventEmitter implements Pool {
  workers: IWorker[] = [];
  freeWorkers: IWorker[] = [];
  queue: QueueItem[] = [];
  maxWorkers = 0;
  availability = 0;

  constructor(private options: WorkerPoolOptions) {
    super();

    this.maxWorkers = this.options.maxWorkers ?? os.cpus().length - 1;
    this.availability = this.maxWorkers;

    this.workers = [];
    this.freeWorkers = [];
    this.queue = [];

    this.ensureWorkers();

    // Any time the kWorkerFreedEvent is emitted, dispatch
    // the next task pending in the queue, if any.
    this.on(workerFreedEvent, () => {
      if (this.queue.length > 0) {
        this._exec();
      }
    });
  }

  get workerRestarts() {
    return this.workers.reduce((acc, worker) => acc + worker.restarts, 0);
  }

  get maxWorkerMemoryUsage() {
    return this.workers.reduce((acc, worker) => Math.max(acc, worker.maxWorkerMemoryUsage), 0);
  }

  stats() {
    return {
      maxWorkerMemoryUsage: this.maxWorkerMemoryUsage,
      workerRestarts: this.workerRestarts,
    };
  }

  ensureWorkers() {
    if (this.workers.length === 0) {
      for (let i = 0; i < this.maxWorkers; i++) {
        this.addNewWorker();
      }
    }
  }

  addNewWorker() {
    const { script, workerOptions } = this.options;
    const worker = new ThreadWorker(script, { workerOptions, workerIdleMemoryLimit: this.options.workerIdleMemoryLimit });
    worker.on("free", (data) => {
      const { weight } = data;
      this.availability += weight;
      this.emit(workerFreedEvent);
    });
    this.workers.push(worker);
  }

  exec(
    task: Record<string, unknown>,
    weight: number,
    setup?: (worker: IWorker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (worker: IWorker) => void,
    abortSignal?: AbortSignal
  ) {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }

    // cull the weight of the task to be [1, maxWorkers]
    weight = Math.min(Math.max(1, weight), this.maxWorkers);

    return new Promise((resolve, reject) => {
      this.queue.push({ task: { ...task, weight }, weight, resolve, reject, cleanup, setup });
      this._exec(abortSignal);
    });
  }

  _exec(abortSignal?: AbortSignal) {
    // find work that will fit the availability of workers
    const workIndex = this.queue.findIndex((item) => item.weight <= this.availability);

    if (workIndex === -1) {
      return;
    }

    const worker = this.workers.find((w) => w.status === "free");

    if (worker) {
      const work = this.queue[workIndex];
      this.queue.splice(workIndex, 1);
      this.availability -= work.weight;
      worker.start(work, abortSignal);
    }
  }

  async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
