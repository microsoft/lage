import { AsyncResource } from "async_hooks";
import { Readable } from "stream";
import { IWorker } from "./types/WorkerQueue.js";

export interface TaskInfoOptions {
  id: string;
  setup: undefined | ((worker: IWorker, stdout: Readable, stderr: Readable) => void);
  cleanup: undefined | ((worker: IWorker) => void);
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  worker: IWorker;
  weight: number;
  abortSignal?: AbortSignal;
}

export class TaskInfo extends AsyncResource {
  constructor(private options: TaskInfoOptions) {
    super("WorkerPoolTaskInfo");

    if (options.setup) {
      this.runInAsyncScope(options.setup, null, options.worker, options.worker.stdout, options.worker.stderr);
    }
  }

  get id() {
    return this.options.id;
  }

  get weight() {
    return this.options.weight;
  }

  get abortSignal() {
    return this.options.abortSignal;
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
