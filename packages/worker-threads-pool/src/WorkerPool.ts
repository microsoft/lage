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
  constructor(
    private options: {
      setup: (worker: Worker) => void;
      cleanup: (worker: Worker) => void;
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      worker: Worker;
    }
  ) {
    super("WorkerPoolTaskInfo");
    this.runInAsyncScope(options.setup, null, options.worker);
  }

  done(err: Error, results: unknown) {
    const { cleanup, worker, resolve, reject } = this.options;

    if (cleanup) {
      this.runInAsyncScope(cleanup, null, worker);
    }

    if (err) {
      this.runInAsyncScope(reject, null, err, worker);
    } else {
      this.runInAsyncScope(resolve, null, results, worker);
    }

    this.emitDestroy();
  }
}

interface WorkerPoolOptions {
  maxWorkers?: number;
  script: string;
  workerOptions?: WorkerOptions;
}

interface QueueItem {
  setup?: (worker: Worker) => void;
  cleanup?: (worker: Worker) => void;
  task: unknown;
  resolve: (value?: unknown) => void;
  reject: (reason: unknown) => void;
}

export class WorkerPool extends EventEmitter {
  workers: Worker[] = [];
  freeWorkers: Worker[] = [];
  queue: QueueItem[] = [];

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

    const msgHandler = (data) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      const { err, results } = data;

      worker[kTaskInfo].done(err, results);
      worker[kTaskInfo] = null;
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    }

    worker.on("message", msgHandler);

    const errHandler = (err) => {
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
    }

    worker.on("error", errHandler);

    this.workers.push(worker);
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  exec(task: unknown, setup?: (worker: Worker) => void, cleanup?: (worker: Worker) => void) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, cleanup, setup });
      this._exec();
    });
  }

  _exec() {
    if (this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop();
      const work = this.queue.shift();
      const { task, resolve, reject, cleanup, setup } = work as any;

      if (worker) {
        worker[kTaskInfo] = new WorkerPoolTaskInfo({ cleanup, resolve, reject, worker, setup });
        worker.postMessage(task);
      }
    }
  }

  async close() {
    for (const worker of this.workers) {
      worker.removeAllListeners();
      await worker.terminate();
    }
  }
}
