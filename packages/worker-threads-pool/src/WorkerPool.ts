/**
 * Heavily based on a publically available worker pool implementation in node.js documentation:
 * https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool
 */

import { AsyncResource } from "async_hooks";
import { createFilteredStreamTransform } from "./createFilteredStreamTransform";
import { createInterface } from "readline";
import { END_WORKER_STREAM_MARKER, START_WORKER_STREAM_MARKER } from "./stdioStreamMarkers";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import os from "os";
import type { Pool } from "./Pool";
import type { Readable } from "stream";
import type { WorkerOptions } from "worker_threads";

const kTaskInfo = Symbol("kTaskInfo");
const kWorkerFreedEvent = Symbol("kWorkerFreedEvent");
const kWorkerCapturedStreamEvents = Symbol("kWorkerCapturedStreamEvents");
const kWorkerCapturedStreamPromise = Symbol("kWorkerCapturedStreamPromise");

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(
    private options: {
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
    const capturedStreamEvent = new EventEmitter();
    worker[kWorkerCapturedStreamEvents] = capturedStreamEvent;

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

      return (line: string) => {
        if (line.includes(START_WORKER_STREAM_MARKER)) {
          lines = [];
        } else if (line.includes(END_WORKER_STREAM_MARKER)) {
          worker[kWorkerCapturedStreamEvents].emit("end", lines);
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

    const capturedStreamEvent = new EventEmitter();
    worker[kWorkerCapturedStreamEvents] = capturedStreamEvent;
    worker[kWorkerCapturedStreamPromise] = Promise.resolve();
    this.captureWorkerStdioStreams(worker);
    worker["filteredStdout"] = worker.stdout.pipe(createFilteredStreamTransform());
    worker["filteredStderr"] = worker.stderr.pipe(createFilteredStreamTransform());

    const msgHandler = (data) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      worker[kWorkerCapturedStreamPromise].then(() => {
        const { err, results } = data;

        worker[kTaskInfo].done(err, results);
        worker[kTaskInfo] = null;
        this.freeWorkers.push(worker);
        this.emit(kWorkerFreedEvent);
      });
    };

    worker.on("message", msgHandler);

    const errHandler = (err) => {
      worker[kWorkerCapturedStreamPromise].then(() => {
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

  exec(task: unknown, setup?: (worker?: Worker, stdout?: Readable, stderr?: Readable) => void, cleanup?: (worker: Worker) => void) {
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

        worker[kWorkerCapturedStreamPromise] = new Promise<void>((onResolve) => {
          worker[kWorkerCapturedStreamEvents].once("end", onResolve);
        });

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
