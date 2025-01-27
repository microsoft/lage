import { bufferTransform } from "./bufferTransform.js";
import { getLageOutputCacheLocation } from "./getLageOutputCacheLocation.js";
import { type LogEntry, LogLevel } from "@lage-run/logger";

import fs from "fs";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

import type { Pool } from "@lage-run/worker-threads-pool";
import type { TargetRun, TargetStatus } from "@lage-run/scheduler-types";
import { getStartTargetId, type Target } from "@lage-run/target-graph";
import type { Logger } from "@lage-run/logger";
import type { TargetHasher } from "@lage-run/hasher";
import type { MessagePort } from "worker_threads";

export interface WrappedTargetOptions {
  root: string;
  target: Target;
  logger: Logger;
  shouldCache: boolean;
  continueOnError: boolean;
  abortController: AbortController;
  pool: Pool;
  hasher: TargetHasher;
  onMessage?: (message: any, postMessage: MessagePort["postMessage"]) => void;
}

export interface WorkerResult {
  stdoutBuffer: string;
  stderrBuffer: string;
  skipped: boolean;
  hash: string;
  value: unknown;
  id: string;
}

/**
 * Wraps a target with additional functionality:
 * 1. Caching
 * 2. Logging
 * 3. Abort signal
 * 4. Continue on error
 */
export class WrappedTarget implements TargetRun<WorkerResult> {
  #status: TargetStatus = "pending";
  #result: WorkerResult | undefined;
  queueTime: [number, number] = [0, 0];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  target: Target;
  threadId = 0;

  get result() {
    return this.#result;
  }

  get status() {
    return this.#status;
  }

  get abortController() {
    return this.options.abortController;
  }

  set abortController(abortController: AbortController) {
    this.options.abortController = abortController;
  }

  get successful() {
    return this.#status === "skipped" || this.#status === "success";
  }

  get waiting() {
    return this.#status === "pending" || this.#status === "queued";
  }

  constructor(public options: WrappedTargetOptions) {
    this.target = options.target;

    if (this.target.id === getStartTargetId()) {
      this.#status = "success";
    }

    this.options.logger.info("", { target: this.target, status: this.status });
  }

  onQueued() {
    this.#status = "queued";
    this.queueTime = process.hrtime();
    this.options.logger.info("", { target: this.target, status: "queued" });
  }

  onAbort() {
    this.#status = "aborted";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("", { target: this.target, status: "aborted", threadId: this.threadId });
  }

  onStart(threadId: number) {
    if (this.status !== "running") {
      this.threadId = threadId;
      this.#status = "running";
      this.startTime = process.hrtime();
      this.options.logger.info("", { target: this.target, status: "running", threadId });
    }
  }

  onComplete() {
    this.#status = "success";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("", {
      target: this.target,
      status: "success",
      duration: this.duration,
      threadId: this.threadId,
    });
  }

  onFail() {
    this.#status = "failed";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("", {
      target: this.target,
      status: "failed",
      duration: this.duration,
      threadId: this.threadId,
    });

    if (!this.options.continueOnError && this.options.abortController) {
      this.options.abortController.abort();
    }
  }

  onSkipped(hash?: string | undefined) {
    if (this.startTime[0] !== 0 && this.startTime[1] !== 0) {
      this.duration = process.hrtime(this.startTime);
    }

    this.#status = "skipped";

    if (hash) {
      this.options.logger.info("", {
        target: this.target,
        status: "skipped",
        duration: this.duration,
        hash,
        threadId: this.threadId,
      });
    }
  }

  async run() {
    const { target, logger, shouldCache, abortController, root } = this.options;

    const abortSignal = abortController.signal;

    if (abortSignal.aborted) {
      this.onStart(0);
      this.onAbort();
      return;
    }

    try {
      this.#result = await this.runInPool();

      const cacheEnabled = target.cache && shouldCache && this.#result.hash;
      // Save output if cache is enabled & cache is hit
      if (!this.#result.skipped && cacheEnabled) {
        const outputLocation = getLageOutputCacheLocation(root, this.#result.hash);
        const outputPath = path.dirname(outputLocation);
        await mkdir(outputPath, { recursive: true });

        const output = `${this.#result.stdoutBuffer}\n${this.#result.stderrBuffer}`;

        await writeFile(outputLocation, output);

        logger.verbose(`>> Saved cache - ${this.#result.hash}`, { target });
      }

      if (this.#result.skipped) {
        const { hash } = this.#result;

        const cachedOutputFile = getLageOutputCacheLocation(root, hash ?? "");

        const shouldShowCachedOutput = fs.existsSync(cachedOutputFile);
        if (shouldShowCachedOutput) {
          const cachedOutput = fs.readFileSync(cachedOutputFile, "utf8");
          logger.verbose(">> Replaying cached output", { target });
          logger.verbose(cachedOutput.trim(), { target });
        }

        this.onSkipped(hash);
      } else {
        this.onComplete();
      }

      return this.#result;
    } catch (e) {
      if (e instanceof Error) {
        logger.error(String(e), { target });
      }

      if (abortSignal.aborted) {
        this.onAbort();
      } else {
        this.onFail();
      }

      throw e;
    }
  }

  private async runInPool(): Promise<WorkerResult> {
    const { target, logger, abortController, pool } = this.options;
    const abortSignal = abortController.signal;

    let releaseStdout: any;
    let releaseStderr: any;

    const bufferStdout = bufferTransform();
    const bufferStderr = bufferTransform();

    let msgHandler: (data: LogEntry<any> & { type: string }) => void;

    const result = await (pool.exec(
      { target },
      target.weight ?? 1,
      (worker, stdout, stderr) => {
        const postMessage = worker.postMessage.bind(worker);

        msgHandler = (data) => {
          if (data.type === "log") {
            logger.log(data.level, data.msg, { target, threadId: worker.threadId });
          } else if (data.type === "hash") {
            this.options.hasher.hash(target).then((hash) => {
              worker.postMessage({ type: "hash", hash });
            });
          } else if (this.options.onMessage) {
            this.options.onMessage(data, postMessage);
          }
        };

        worker.on("message", msgHandler);

        const threadId = worker.threadId;

        this.onStart(threadId);

        stdout.pipe(bufferStdout.transform);
        stderr.pipe(bufferStderr.transform);

        const releaseStdoutStream = logger.stream(LogLevel.verbose, stdout, { target, threadId });

        releaseStdout = () => {
          releaseStdoutStream();
          stdout.unpipe(bufferStdout.transform);
        };

        const releaseStderrStream = logger.stream(LogLevel.verbose, stderr, { target, threadId });

        releaseStderr = () => {
          releaseStderrStream();
          stderr.unpipe(bufferStderr.transform);
        };
      },
      (worker) => {
        worker.off("message", msgHandler);
        releaseStdout();
        releaseStderr();
      },
      abortSignal,
      target.priority
    ) as Promise<{ value?: unknown; skipped: boolean; hash: string; id: string }>);

    return {
      stdoutBuffer: bufferStdout.buffer,
      stderrBuffer: bufferStderr.buffer,
      skipped: result?.skipped,
      hash: result?.hash,
      value: result?.value,
      id: result?.id,
    };
  }

  /**
   * A JSON representation of this wrapped target, suitable for serialization in tests.
   *
   * Skips the unpredictable properties of the wrapped target like the startTime and duration.
   *
   * @returns
   */
  toJSON() {
    return {
      target: this.target.id,
      status: this.status,
    };
  }

  /**
   * Reset the state of this wrapped target.
   */
  reset() {
    this.#result = undefined;
    this.#status = "pending";
  }
}
