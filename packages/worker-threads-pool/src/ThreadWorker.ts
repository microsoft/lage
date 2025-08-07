import { createFilteredStreamTransform } from "./createFilteredStreamTransform.js";
import { createInterface } from "readline";
import { endMarker, startMarker } from "./stdioStreamMarkers.js";
import { EventEmitter } from "events";
import { Readable } from "stream";
import { TaskInfo } from "./TaskInfo.js";
import { type TransferListItem, Worker } from "worker_threads";
import crypto from "crypto";
import v8 from "v8";
import type { IWorker } from "./types/WorkerQueue.js";
import type { QueueItem } from "./types/WorkerQueue.js";
import type { WorkerOptions as ThreadWorkerOptions } from "worker_threads";

export interface WorkerOptions {
  workerOptions?: ThreadWorkerOptions;
  workerIdleMemoryLimit?: number;
  workerIdleMemoryLimitPercentage?: number;
}

interface StdioInfo {
  stream: Readable;
  promise: Promise<void>;
  resolve: () => void;
}

const workerFreeEvent = "free";

const maxOldSpaceSizeBytes = v8.getHeapStatistics().total_available_size;

export class ThreadWorker extends EventEmitter implements IWorker {
  #taskInfo: TaskInfo | undefined;

  #stdoutInfo: StdioInfo = { stream: new Readable(), promise: Promise.resolve(), resolve: () => {} };
  #stderrInfo: StdioInfo = { stream: new Readable(), promise: Promise.resolve(), resolve: () => {} };

  // @ts-ignore TS2564
  #worker: Worker;

  status: "free" | "busy" = "busy";
  restarts = 0;

  maxWorkerMemoryUsage = 0;

  constructor(
    private script: string,
    private options: WorkerOptions
  ) {
    super();

    if (!options.workerIdleMemoryLimitPercentage) {
      options.workerIdleMemoryLimitPercentage = 80;
    }

    this.#createNewWorker();
  }

  #createNewWorker() {
    const { workerOptions } = this.options;
    const script = this.script;
    const worker = new Worker(script, { ...workerOptions, stdout: true, stderr: true });

    this.#captureWorkerStdioStreams(worker);

    const filteredStdout = worker.stdout.pipe(createFilteredStreamTransform());
    const filteredStderr = worker.stderr.pipe(createFilteredStreamTransform());

    let capturedStdoutResolve = () => {};
    const capturedStdoutPromise = new Promise<void>((resolve) => {
      capturedStdoutResolve = resolve;
      resolve();
    });

    let capturedStderrResolve = () => {};
    const capturedStderrPromise = new Promise<void>((resolve) => {
      capturedStderrResolve = resolve;
      resolve();
    });

    const msgHandler = (data) => {
      if (data.type === "status") {
        // In case of success: Call the callback that was passed to `runTask`,
        // remove the `TaskInfo` associated with the Worker, and mark it as free
        // again.
        Promise.all([this.#stdoutInfo.promise, this.#stderrInfo.promise]).then(() => {
          const { err, results } = data;
          if (this.#taskInfo) {
            this.#taskInfo.abortSignal?.removeEventListener("abort", this.#handleAbort);
            this.#taskInfo.done(err, results);
          }
          this.checkMemoryUsage();
        });
      } else if (data.type === "report-memory-usage") {
        this.maxWorkerMemoryUsage = Math.max(this.maxWorkerMemoryUsage, data.memoryUsage);

        const workerMaxOldGenSizeMb = this.#worker.resourceLimits?.maxOldGenerationSizeMb;

        const limit =
          this.options.workerIdleMemoryLimit ??
          ((workerMaxOldGenSizeMb ? workerMaxOldGenSizeMb * 1024 * 1024 : maxOldSpaceSizeBytes) *
            (this.options.workerIdleMemoryLimitPercentage as number)) /
            100;

        if (limit && data.memoryUsage > limit) {
          this.restart();
        } else {
          this.#ready();
        }
      } else {
        this.emit("message", data);
      }
    };

    worker.on("message", msgHandler);

    const errHandler = (err) => {
      // We likely have a worker that has crashed - many instances of this is due to out-of-memory errors, we need to fail fast!
      this.#stdoutInfo.resolve();
      this.#stderrInfo.resolve();

      // In case of an uncaught exception: Call the callback that was passed to
      // `runTask` with the error, otherwise, just emit an "error" event (which will crash the process if not handled)
      if (this.#taskInfo) {
        this.#taskInfo.abortSignal?.removeEventListener("abort", this.#handleAbort);
        this.#taskInfo.done(err, null);
      } else {
        this.emit("error", err);
      }
    };

    // The 'error' event is emitted if the worker thread throws an uncaught exception. In that case, the worker is terminated.
    worker.on("error", errHandler);

    // Assign the new worker to private properties
    this.#worker = worker;

    this.#stdoutInfo = {
      stream: filteredStdout,
      promise: capturedStdoutPromise,
      resolve: capturedStdoutResolve,
    };

    this.#stderrInfo = {
      stream: filteredStderr,
      promise: capturedStderrPromise,
      resolve: capturedStderrResolve,
    };

    this.#ready();
  }

  #ready() {
    let weight = 1;

    if (this.#taskInfo) {
      weight = this.#taskInfo.weight;
      this.#taskInfo = undefined;
    }

    this.status = "free";
    this.emit(workerFreeEvent, { weight });
  }

  #captureWorkerStdioStreams(worker: Worker) {
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

    // by the time we have a "line" event, we expect there to have been a this.#taskInfo
    const lineHandlerFactory = (outputType: string) => {
      let lines: string[] = [];
      let resolve: () => void;

      return (line: string) => {
        if (!this.#taskInfo) {
          // Somehow this lineHandler function is called AFTER the worker has been freed.
          // This can happen if there are stray setTimeout(), etc. with callbacks that outputs some messages in stdout/stderr
          // In this case, we will ignore the output
          return;
        }

        if (line.includes(startMarker(this.#taskInfo.id))) {
          lines = [];
          if (outputType === "stdout") {
            resolve = this.#stdoutInfo.resolve;
          } else {
            resolve = this.#stderrInfo.resolve;
          }
        } else if (line.includes(endMarker(this.#taskInfo.id))) {
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

  #handleAbort() {
    if (this.#worker) {
      this.#worker.postMessage({ type: "abort" });
    }
  }

  start(work: QueueItem, abortSignal?: AbortSignal) {
    this.status = "busy";

    const { task, resolve, reject, cleanup, setup } = work;

    abortSignal?.addEventListener("abort", this.#handleAbort);

    const id = crypto.randomBytes(32).toString("hex");

    this.#taskInfo = new TaskInfo({ id, weight: work.weight, cleanup, resolve, reject, worker: this, setup, abortSignal });

    // Create a pair of promises that are only resolved when a specific task end marker is detected
    // in the worker's stdout/stderr streams.
    this.#stdoutInfo.promise = new Promise<void>((onResolve) => {
      this.#stdoutInfo.resolve = onResolve;
    });

    this.#stderrInfo.promise = new Promise<void>((onResolve) => {
      this.#stderrInfo.resolve = onResolve;
    });

    this.#worker.postMessage({ type: "start", task: { ...task, weight: work.weight }, id });
  }

  get weight() {
    return this.#taskInfo?.weight ?? 1;
  }

  get stdout() {
    return this.#stdoutInfo.stream;
  }

  get stderr() {
    return this.#stderrInfo.stream;
  }

  get resourceLimits() {
    return this.#worker.resourceLimits;
  }

  get threadId() {
    return this.#worker.threadId;
  }

  terminate() {
    this.#worker.removeAllListeners();
    this.#worker.terminate();
    this.#worker.unref();
  }

  restart() {
    this.restarts++;
    this.status = "busy";
    this.#worker.terminate();
    this.#createNewWorker();
  }

  async checkMemoryUsage() {
    this.#worker.postMessage({ type: "check-memory-usage" });
  }

  postMessage(value: any, transferList?: readonly TransferListItem[] | undefined): void {
    this.#worker.postMessage(value, transferList);
  }
}
