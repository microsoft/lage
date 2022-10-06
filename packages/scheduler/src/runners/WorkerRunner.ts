import type { AbortSignal } from "abort-controller";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunner } from "@lage-run/scheduler-types";

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
 * module.exports = async function lint({ target, abortSignal }) {
 *  if (abortSignal.aborted) {
 *    return;
 *  }
 *
 *  // Do work here - but be sure to have a way to abort via the `abortSignal`
 * }
 * ```
 */
export class WorkerRunner implements TargetRunner {
  static gracefulKillTimeout = 2500;

  async run(target: Target, abortSignal?: AbortSignal) {
    if (!target.options?.worker) {
      throw new Error('WorkerRunner: "worker" configuration is required - e.g. { type: "worker", worker: "./worker.js" }');
    }

    const scriptFile = target.options?.worker ?? target.options?.script;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const scriptModule = require(scriptFile);
    const runFn = typeof scriptModule.default === "function" ? scriptModule.default : scriptModule;

    if (typeof runFn !== "function") {
      throw new Error("WorkerRunner: worker script must export a function; you likely need to use `module.exports = function() {...}`");
    }

    await runFn({ target, abortSignal });
  }
}
