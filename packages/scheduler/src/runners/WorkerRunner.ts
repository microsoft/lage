import { LogLevel } from "@lage-run/logger";
import type { AbortSignal } from "abort-controller";
import type { Logger } from "@lage-run/logger";
import type { Target, TargetConfig } from "@lage-run/target-graph";
import type { TargetRunner } from "../types/TargetRunner";
import type { Worker } from "worker_threads";

export interface WorkerRunnerOptions {
  logger: Logger;
}

/**
 * Creates a workerpool per target task definition of "type: worker"
 *
 * Target options are fed into `workerpool`, so target can customize the pool:
 *
 * https://www.npmjs.com/package/workerpool
 *
 * Example:
 *
 * ```ts
 * // lage.config.js
 * {
 *   pipeline: {
 *     "lint": {
 *       type: "worker",
 *       options: {
 *         worker: "workers/lint.js",
 *         maxWorkers: 15
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ```js
 * // worker.js
 * module.exports = async function lint({ target }) {
 *  // lint the target!
 * }
 * ```
 */
export class WorkerRunner implements TargetRunner {
  static gracefulKillTimeout = 2500;

  constructor(private options: WorkerRunnerOptions) {}

  captureStream(target: Target, worker: Worker) {
    const { logger } = this.options;

    const stdout = worker.stdout;
    const stderr = worker.stderr;
    const onData = (data: string) => logger.log(LogLevel.info, data, { target });

    stdout.setEncoding("utf-8");
    stdout.on("data", onData);

    stderr.setEncoding("utf-8");
    stderr.on("data", onData);

    return () => {
      stdout.off("data", onData);
      stderr.off("data", onData);
    };
  }

  async run(target: Target, abortSignal?: AbortSignal) {
    const { logger } = this.options;

    if (!target.options?.worker) {
      throw new Error('WorkerRunner: "worker" configuration is required - e.g. { type: "worker", worker: "./worker.js" }');
    }

    const scriptFile = target.options?.worker;

    logger.verbose(`Running script: ${scriptFile}`, { target });
    const scriptModule = require(target.options.worker);
    const runFn = typeof scriptModule.default === "function" ? scriptModule.default : scriptModule;
    await runFn({ target });
  }
}
