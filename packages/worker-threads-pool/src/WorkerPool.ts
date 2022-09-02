/**
 * Heavily based on a publically available worker pool implementation in node.js documentation:
 * https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
 */

import { AsyncResource } from "node:async_hooks";
import { EventEmitter } from "node:events";
import { Worker } from "node:worker_threads";
import os from "node:os";
import type { WorkerOptions } from "node:worker_threads";

const kTaskInfo = Symbol("kTaskInfo");
const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(private resolve: (value: unknown) => void, private reject: (reason: unknown) => void, private worker: Worker) {
    super("WorkerPoolTaskInfo");
  }

  done(err: Error, results: unknown) {
    if (err) {
      this.runInAsyncScope(this.reject, null, err, this.worker);
    } else {
      this.runInAsyncScope(this.resolve, null, results, this.worker);
    }

    this.emitDestroy();
  }
}

interface WorkerPoolOptions {
  maxWorkers?: number;
  script: string;
  workerOptions?: WorkerOptions;
}

export class WorkerPool extends EventEmitter {
  workers: Worker[] = [];
  freeWorkers: Worker[] = [];
  queue: { task: unknown; resolve: (value?: unknown) => void; reject: (reason: unknown) => void }[] = [];

  constructor(private options: WorkerPoolOptions) {
    super();
    const { maxWorkers = os.cpus().length - 1 } = options;

    this.workers = [];
    this.freeWorkers = [];
    this.queue = [];

    for (let i = 0; i < maxWorkers; i++) {
      this.addNewWorker();
    }

    // Any time the kWorkerFreedEvent is emitted, dispatch
    // the next task pending in the queue, if any.
    this.on(kWorkerFreedEvent, () => {
      if (this.queue.length > 0) {
        this._exec();
      }
    });
  }

  addNewWorker() {
    const { script, workerOptions } = this.options;
    const worker = new Worker(script, workerOptions);

    worker.on("message", (data) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      const { err, results } = data;

      worker[kTaskInfo].done(err, results);
      worker[kTaskInfo] = null;
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    });

    worker.on("error", (err) => {
      // In case of an uncaught exception: Call the callback that was passed to
      // `runTask` with the error.
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(err, null);
      }

      this.emit("error", err);
      // Remove the worker from the list and start a new Worker to replace the
      // current one.
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.addNewWorker();
    });

    this.workers.push(worker);

    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  exec(task: unknown) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._exec();
    });
  }

  _exec() {
    if (this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop();
      const work = this.queue.shift();
      const { task, resolve, reject } = work as any;

      if (worker) {
        this.emit("running", {
          worker,
          task,
        });

        worker[kTaskInfo] = new WorkerPoolTaskInfo(resolve, reject, worker);
        worker.postMessage(task);
      }
    }
  }

  close() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
