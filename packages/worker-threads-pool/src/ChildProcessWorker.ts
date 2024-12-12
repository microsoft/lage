import { createFilteredStreamTransform } from "./createFilteredStreamTransform.js";
import { createInterface } from "readline";
import { endMarker, startMarker } from "./stdioStreamMarkers.js";
import { EventEmitter } from "events";
import { Readable } from "stream";
import { TaskInfo } from "./TaskInfo.js";
import { fork, ChildProcess } from "child_process";
import crypto from "crypto";
import type { IWorker } from "./types/WorkerQueue.js";
import type { QueueItem } from "./types/WorkerQueue.js";

export interface WorkerOptions {
  workerOptions?: { execArgv?: string[] };
  workerIdleMemoryLimit?: number;
  workerIdleMemoryLimitPercentage?: number;
}

interface StdioInfo {
  stream: Readable;
  promise: Promise<void>;
  resolve: () => void;
}

const workerFreeEvent = "free";

export class ChildProcessWorker extends EventEmitter implements IWorker {
  #taskInfo: TaskInfo | undefined;
  #childProcess: ChildProcess | undefined;
  threadId: number;
  weight: number;
  restarts: number;
  maxWorkerMemoryUsage: number;
  status: "free" | "busy" = "free";

  #stdoutInfo: StdioInfo = { stream: new Readable(), promise: Promise.resolve(), resolve: () => {} };
  #stderrInfo: StdioInfo = { stream: new Readable(), promise: Promise.resolve(), resolve: () => {} };

  constructor(private script: string, private options: WorkerOptions) {
    super();

    if (!options.workerIdleMemoryLimitPercentage) {
      options.workerIdleMemoryLimitPercentage = 80;
    }

    const cp = this.#createProcess();
    this.threadId = cp.pid ?? -1;
    this.weight = 1.0;
    this.restarts = 0;
    this.maxWorkerMemoryUsage = 0;
  }

  #createProcess() {
    const { workerOptions } = this.options;
    this.#childProcess = fork(this.script, [], workerOptions);

    this.#childProcess.stdout?.pipe(createFilteredStreamTransform()).pipe(this.#stdoutInfo.stream);
    this.#childProcess.stderr?.pipe(createFilteredStreamTransform()).pipe(this.#stderrInfo.stream);

    this.#childProcess.on("message", (message) => {
      if (message === "done") {
        this.emit(workerFreeEvent);
      }
    });

    this.#childProcess.on("exit", (code) => {
      if (code !== 0) {
        this.emit("error", new Error(`Worker stopped with exit code ${code}`));
      }
    });

    return this.#childProcess;
  }

  start(work: QueueItem, abortSignal?: AbortSignal) {
    const { workerOptions } = this.options;
  }

  postMessage(value: any) {
    return this.#childProcess?.send(value);
  }

  restart() {
    this.#childProcess?.kill();

    this.restarts++;
    this.#createProcess();
  }

  terminate(): void {
    this.#childProcess?.kill();
  }

  get stdout(): Readable {
    return this.#stdoutInfo.stream;
  }

  get stderr(): Readable {
    return this.#stderrInfo.stream;
  }
}
