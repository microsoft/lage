import type { TargetRunner, TargetRunResult, TargetRunOptions } from "./types/TargetRunner.js";
import type { Target } from "@lage-run/target-graph";
import { pathToFileURL } from "url";

/** `WorkerRunner` constructor options */
export interface WorkerRunnerOptions {
  taskArgs: string[];
}

/** `Target/TargetConfig.options` for for targets of `type: "worker"` */
export type WorkerTargetOptions =
  // TODO: pick either `worker` or `script` in a future version...
  // Old docs also included a `maxWorkers` option which is only read by getMaxWorkersPerTask (config package),
  // so it's better specified at the next level up as a TargetConfig prop.
  | {
      /** Path to the worker script file. It must export a function of type `WorkerRunnerFunction`. */
      worker: string;
    }
  | {
      /** Path to the worker script file. It must export a function of type `WorkerRunnerFunction`. */
      script: string;
    };

/** Options for the function exported by a worker file */
export type WorkerRunnerFunctionOptions = TargetRunOptions & WorkerRunnerOptions;

/**
 * Type of the function exported by a worker file.
 */
export type WorkerRunnerFunction = (options: WorkerRunnerFunctionOptions) => Promise<TargetRunResult | void>;

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
 *       maxWorkers: 15,
 *       options: {
 *         script: "workers/lint.js"
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ```js
 * // worker.js - type is WorkerRunnerFunction
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
  constructor(private runnerOptions: Pick<WorkerRunnerOptions, "taskArgs">) {}

  public async shouldRun(target: Target): Promise<boolean> {
    const scriptModule = await this.getScriptModule(target);

    if (typeof scriptModule.shouldRun === "function") {
      return (await scriptModule.shouldRun(target)) && (target.shouldRun ?? true);
    }

    return target.shouldRun ?? true;
  }

  public async run(runOptions: TargetRunOptions): Promise<TargetRunResult | void> {
    const { target, weight, abortSignal } = runOptions;
    const { taskArgs } = this.runnerOptions;

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

    return await (runFn as WorkerRunnerFunction)({ target, weight, taskArgs, abortSignal });
  }

  private async getScriptModule(target: Target): Promise<any> {
    const targetOptions = target.options as WorkerTargetOptions | undefined;
    const scriptFile = targetOptions && "worker" in targetOptions ? targetOptions.worker : targetOptions?.script;

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
