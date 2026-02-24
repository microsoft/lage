import type { WorkerRunnerOptions, WorkerRunnerFunction } from "../packages/runners/src/WorkerRunner.js";
import type { Target } from "../packages/target-graph/src/index.js";

export type { WorkerRunnerFunction };

/**
 * Type for worker functions that are reused by `commands/*.js`, only requiring the relevant
 * subset of options.
 */
export type BasicWorkerRunnerFunction = (
  params: Pick<WorkerRunnerOptions, "taskArgs"> & {
    target: Pick<Target, "packageName" | "cwd">;
  }
) => ReturnType<WorkerRunnerFunction>;
