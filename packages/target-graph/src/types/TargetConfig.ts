import type { Target } from "./Target.js";

/**
 * Target configuration - to be used inside `lage.config.js` options.pipeline configurations
 */
export interface TargetConfig {
  /**
   * The type of the target - The configuration parser will use the id of the target to determine the type.
   * e.g. npmScript, worker
   */
  type?: string;

  /**
   * @deprecated - use `dependsOn` instead
   *
   * The dependencies of the target. Dependencies are target specs in one of these forms:
   * - "pkg-a#build"
   * - "build"
   * - "^build"
   * - "^^build"
   */
  deps?: string[];

  /**
   * The dependencies of the target. Dependencies are target specs in one of these forms:
   * - "pkg-a#build"
   * - "build"
   * - "^build"
   * - "^^build"
   */
  dependsOn?: string[];

  /**
   * Inputs for targets. This is used to determine the hash key for caching
   */
  inputs?: string[];

  /**
   * Outputs for targets. This is used to determine the files to be stored for caching
   */
  outputs?: string[];

  /**
   * Priority of the target. A priority of >0 will always be prioritized over the default targets in queue
   */
  priority?: number;

  /**
   * Whether to cache this target (defaults to true)
   */
  cache?: boolean;

  /**
   * An optional override of environmentGlob for cases when targets that need different patterns
   */
  environmentGlob?: string[];

  /**
   * How many workers to dedicate to this task type
   */
  maxWorkers?: number;

  /**
   * Weight of a target - used to determine the number of "worker slots" to dedicate to a target
   *
   * Even if we have workers "free", we might not want to dedicate them to a target that is very heavy (i.e. takes multiple CPU cores).
   * An example is jest targets that can take up multiple cores with its own worker pool.
   *
   * This weight will be "culled" to the max number of workers (concurrency) for the target type. (i.e. maxWorkers above)
   */
  weight?: number | ((target: Target, maxWorkers?: number) => number);

  /**
   * Run options for the Target Runner. (e.g. `{ env: ...process.env, colors: true, ... }`)
   */
  options?: Record<string, any>;

  /**
   * An optionally async function that determines whether a target should run or not.
   */
  shouldRun?: (target: Target) => boolean | Promise<boolean>;

  /**
   * Whether this task is one that can be run as a task that runs over a list of git staged files
   * e.g. `lage run --since origin/master`, when encountering this task, it'll add this single task into the graph instead of
   * package tasks.
   */
  stagedTarget?: Omit<TargetConfig, "stagedTask" | "stagedTargetThreshold" | "runEvenNotStaged">;

  /**
   * The number of staged files that causes this target to not be run as a staged target, and instead be run as a package task.
   */
  stagedTargetThreshold?: number;

  /**
   * Whether to always run this target event if it's not staged
   */
  runEvenNotStaged?: boolean;
}
