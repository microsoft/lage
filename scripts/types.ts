import type { WorkerRunnerOptions as BaseWorkerRunnerOptions } from "../packages/runners/src/WorkerRunner.js";
import type { TargetRunnerOptions } from "../packages/runners/src/types/TargetRunner.js";
import type { Target } from "../packages/target-graph/src/index.js";

/**
 * Actual complete worker runner options.
 * TODO: a type like this should be exported from the runners package and used elsewhere...
 */
export type WorkerRunnerOptions = BaseWorkerRunnerOptions & TargetRunnerOptions;

/**
 * Subset of options needed by the worker functions that are reused by `commands/*.js`.
 */
export type BasicWorkerRunnerOptions = Pick<WorkerRunnerOptions, "taskArgs"> & {
  target: Pick<Target, "packageName" | "cwd">;
};
