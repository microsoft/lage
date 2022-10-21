/**
 * Heavily based on a publically available worker pool implementation in node.js documentation:
 * https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
 */

import { AsyncResource } from "async_hooks";
import { createFilteredStreamTransform } from "./createFilteredStreamTransform";
import { createInterface } from "readline";
import { endMarker, startMarker } from "./stdioStreamMarkers";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import crypto from "crypto";
import os from "os";
import type { Pool } from "./types/Pool";
import type { Readable } from "stream";

import type { AbortSignal } from "abort-controller";
import type { WorkerPoolOptions } from "./types/WorkerPoolOptions";

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
      setup: (worker: Worker, stdout: Readable, stderr: Readable) => void;
      cleanup: (worker: Worker) => void;
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      worker: Worker;
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
  task: unknown;
  resolve: (value?: unknown) => void;
  reject: (reason: unknown) => void;
}

export class WorkerPool extends EventEmitter implements Pool {
  workers: Worker[] = [];
  freeWorkers: Worker[] = [];
  queue: QueueItem[] = [];

  constructor(private options: WorkerPoolOptions) {
    super();

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

  ensureWorkers() {
    if (this.workers.length === 0) {
      const { maxWorkers = os.cpus().length - 1 } = this.options;
      for (let i = 0; i < maxWorkers; i++) {
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
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      Promise.all([worker[kWorkerCapturedStdoutPromise], worker[kWorkerCapturedStderrPromise]]).then(() => {
        const { err, results } = data;
        worker[kTaskInfo].done(err, results);
        worker[kTaskInfo] = null;
        this.freeWorkers.push(worker);
        this.emit(kWorkerFreedEvent);
      });
    };

    worker.on("message", msgHandler);

    const errHandler = (err) => {
      Promise.all([worker[kWorkerCapturedStdoutPromise], worker[kWorkerCapturedStderrPromise]]).then(() => {
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
    };

    worker.on("error", errHandler);

    this.workers.push(worker);

    this.freeWorkers.push(worker);
    this.emit(kWorkerFreedEvent);
  }

  exec(
    task: unknown,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (worker: Worker) => void,
    abortSignal?: AbortSignal
  ) {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, cleanup, setup });
      this._exec(abortSignal);
    });
  }

  _exec(abortSignal?: AbortSignal) {
    if (this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop();
      const work = this.queue.shift();
      const { task, resolve, reject, cleanup, setup } = work as any;

      if (worker) {
        abortSignal?.addEventListener("abort", () => {
          worker.postMessage({ type: "abort" });
        });

        const id = crypto.randomBytes(32).toString("hex");

        worker[kTaskInfo] = new WorkerPoolTaskInfo({ id, cleanup, resolve, reject, worker, setup });

        // Create a pair of promises that are only resolved when a specific task end marker is detected
        // in the worker's stdout/stderr streams.
        worker[kWorkerCapturedStdoutPromise] = new Promise<void>((onResolve) => {
          worker[kWorkerCapturedStdoutResolve] = onResolve;
        });

        worker[kWorkerCapturedStderrPromise] = new Promise<void>((onResolve) => {
          worker[kWorkerCapturedStderrResolve] = onResolve;
        });

        worker.postMessage({ type: "start", task, id });
      }
    }
  }

  async close() {
    for (const worker of this.workers) {
      worker.removeAllListeners();
      worker.unref();
    }

    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
