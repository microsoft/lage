import type { RunnerResult, TargetRunner, TargetRunnerOptions } from "./types/TargetRunner.js";
import type { Target } from "@lage-run/target-graph";
import { pathToFileURL } from "url";

export interface WorkerRunnerOptions {
  taskArgs: string[];
}

/**
 * Creates a worker pool per target task definition of "type: worker", to be run with `@lage-run/worker-threads-pool`.
 *
 * The worker script should export a function, which receives an object with target info.
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

  constructor(private options: WorkerRunnerOptions) {}

  async shouldRun(target: Target): Promise<boolean> {
    const scriptModule = await this.getScriptModule(target);

    if (typeof scriptModule.shouldRun === "function") {
      return (await scriptModule.shouldRun(target)) && (target.shouldRun ?? true);
    }

    return target.shouldRun ?? true;
  }

  async run(runOptions: TargetRunnerOptions): Promise<RunnerResult> {
    const { target, weight, abortSignal } = runOptions;
    const { taskArgs } = this.options;

    const scriptModule = await this.getScriptModule(target);
    const runFn =
      typeof scriptModule.run === "function"
        ? scriptModule.run
        : typeof scriptModule.default === "function"
          ? scriptModule.default
          : scriptModule;

    if (typeof runFn !== "function") {
      throw new Error("WorkerRunner: worker script must export a function; you likely need to use `module.exports = function() {...}`");
    }

    return await runFn({ target, weight, taskArgs, abortSignal });
  }

  async getScriptModule(target: Target): Promise<any> {
    const scriptFile = target.options?.worker ?? target.options?.script;

    if (!scriptFile) {
      throw new Error('WorkerRunner: "script" configuration is required - e.g. { type: "worker", script: "./worker.js" }');
    }

    let importScript = scriptFile;

    if (!importScript.startsWith("file://")) {
      importScript = pathToFileURL(importScript).toString();
    }

    return await import(importScript);
  }
}
