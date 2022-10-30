/**
 * Heavily based on a publically available worker pool implementation in node.js documentation:
 * https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
 */

import { AsyncResource } from "async_hooks";
import { createFilteredStreamTransform } from "./createFilteredStreamTransform.js";
import { createInterface } from "readline";
import { endMarker, startMarker } from "./stdioStreamMarkers.js";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import crypto from "crypto";
import os from "os";
import type { Pool } from "./types/Pool.js";
import type { Readable } from "stream";

import type { AbortSignal } from "abort-controller";
import type { WorkerPoolOptions } from "./types/WorkerPoolOptions.js";

const kTaskInfo = Symbol("kTaskInfo");
const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");

const kWorkerCapturedStdoutResolve = Symbol("kWorkerCapturedStdoutResolve");
const kWorkerCapturedStderrResolve = Symbol("kWorkerCapturedStderrResolve");

const kWorkerCapturedStdoutPromise = Symbol("kWorkerCapturedStdoutPromise");
const kWorkerCapturedStderrPromise = Symbol("kWorkerCapturedStderrPromise");

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(
    private options: {
      id: string;
      setup: undefined | ((worker: Worker, stdout: Readable, stderr: Readable) => void);
      cleanup: undefined | ((worker: Worker) => void);
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      worker: Worker;
      weight: number;
    }
  ) {
    super("WorkerPoolTaskInfo");

    if (options.setup) {
      this.runInAsyncScope(options.setup, null, options.worker, options.worker["filteredStdout"], options.worker["filteredStderr"]);
    }
  }

  get id() {
    return this.options.id;
  }

  get weight() {
    return this.options.weight;
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

interface QueueItem {
  setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void;
  cleanup?: (worker: Worker) => void;
  task: Record<string, unknown>;
  weight: number;
  resolve: (value?: unknown) => void;
  reject: (reason: unknown) => void;
}

export class WorkerPool extends EventEmitter implements Pool {
  workers: Worker[] = [];
  freeWorkers: Worker[] = [];
  queue: QueueItem[] = [];
  maxWorkers = 0;
  availability = 0;
  maxWorkerMemoryUsage = 0;
  workerRestarts = 0;

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
    this.on(kWorkerFreedEvent, () => {
      if (this.queue.length > 0) {
        this._exec();
      }
    });
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

  captureWorkerStdioStreams(worker: Worker) {
    const stdout = worker.stdout;
    const stdoutInterface = createInterface({
      input: stdout,
      crlfDelay: Infinity,
    });

    const stderr = worker.stderr;
    const stderrInterface = createInterface({
      input: stderr,
      crlfDelay: Infinity,
    });

    const lineHandlerFactory = (outputType: string) => {
      let lines: string[] = [];
      let resolve: () => void;

      return (line: string) => {
        if (line.includes(startMarker(worker[kTaskInfo].id))) {
          lines = [];
          if (outputType === "stdout") {
            resolve = worker[kWorkerCapturedStdoutResolve];
          } else {
            resolve = worker[kWorkerCapturedStderrResolve];
          }
        } else if (line.includes(endMarker(worker[kTaskInfo].id))) {
          resolve();
        } else {
          lines.push(line);
        }
      };
    };

    const stdoutLineHandler = lineHandlerFactory("stdout");
    const stderrLineHandler = lineHandlerFactory("stderr");

    stdoutInterface.on("line", stdoutLineHandler);
    stderrInterface.on("line", stderrLineHandler);
  }

  addNewWorker() {
    const { script, workerOptions } = this.options;
    const worker = new Worker(script, { ...workerOptions, stdout: true, stderr: true });

    worker[kWorkerCapturedStderrPromise] = Promise.resolve();
    worker[kWorkerCapturedStdoutPromise] = Promise.resolve();

    this.captureWorkerStdioStreams(worker);

    worker["filteredStdout"] = worker.stdout.pipe(createFilteredStreamTransform());
    worker["filteredStderr"] = worker.stderr.pipe(createFilteredStreamTransform());

    const msgHandler = (data) => {
      if (data.type === "status") {
        // In case of success: Call the callback that was passed to `runTask`,
        // remove the `TaskInfo` associated with the Worker, and mark it as free
        // again.
        Promise.all([worker[kWorkerCapturedStdoutPromise], worker[kWorkerCapturedStderrPromise]]).then(() => {
          const { err, results } = data;
          const weight = worker[kTaskInfo].weight;
          worker[kTaskInfo].done(err, results);
          worker[kTaskInfo] = null;

          this.availability += weight;
          this.checkMemoryUsage(worker);
        });
      } else if (data.type === "report-memory-usage") {
        this.maxWorkerMemoryUsage = Math.max(this.maxWorkerMemoryUsage, data.memoryUsage);

        const limit = this.options.workerIdleMemoryLimit ?? os.totalmem();

        if (limit && data.memoryUsage > limit) {
          this.restartWorker(worker);
        } else {
          this.freeWorker(worker);
        }
      }
    };

    worker.on("message", msgHandler);

    const errHandler = (err) => {
      Promise.all([worker[kWorkerCapturedStdoutPromise], worker[kWorkerCapturedStderrPromise]]).then(() => {
        // In case of an uncaught exception: Call the callback that was passed to
        // `runTask` with the error.
        if (worker[kTaskInfo]) {
          const weight = worker[kTaskInfo].weight;
          worker[kTaskInfo].done(err, null);
          this.availability += weight;
        }

        this.emit("error", err);
        this.restartWorker(worker);
      });
    };

    // The 'error' event is emitted if the worker thread throws an uncaught exception. In that case, the worker is terminated.
    worker.on("error", errHandler);

    this.workers.push(worker);

    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  exec(
    task: Record<string, unknown>,
    weight: number,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (worker: Worker) => void,
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

    if (this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop();

      const work = this.queue[workIndex];

      this.availability -= work.weight;
      this.queue.splice(workIndex, 1);

      const { task, resolve, reject, cleanup, setup } = work;

      if (worker) {
        abortSignal?.addEventListener("abort", () => {
          worker.postMessage({ type: "abort" });
        });

        const id = crypto.randomBytes(32).toString("hex");

        worker[kTaskInfo] = new WorkerPoolTaskInfo({ id, weight: work.weight, cleanup, resolve, reject, worker, setup });

        // Create a pair of promises that are only resolved when a specific task end marker is detected
        // in the worker's stdout/stderr streams.
        worker[kWorkerCapturedStdoutPromise] = new Promise<void>((onResolve) => {
          worker[kWorkerCapturedStdoutResolve] = onResolve;
        });

        worker[kWorkerCapturedStderrPromise] = new Promise<void>((onResolve) => {
          worker[kWorkerCapturedStderrResolve] = onResolve;
        });

        worker.postMessage({ type: "start", task: { ...task, weight: work.weight }, id });
      }
    }
  }

  checkMemoryUsage(worker: Worker) {
    worker.postMessage({ type: "check-memory-usage" });
  }

  freeWorker(worker: Worker) {
    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  restartWorker(worker: Worker) {
    this.workerRestarts++;

    worker.terminate();

    const freeWorkerIndex = this.freeWorkers.indexOf(worker);

    if (freeWorkerIndex !== -1) {
      this.freeWorkers.splice(freeWorkerIndex, 1); // remove from free workers list
    }

    this.workers.splice(this.workers.indexOf(worker), 1);
    this.addNewWorker();
  }

  async close() {
    for (const worker of this.workers) {
      worker.removeAllListeners();
      worker.unref();
    }

    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
