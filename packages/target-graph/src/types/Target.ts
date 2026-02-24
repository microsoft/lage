/**
 * Information about a target: i.e. a task run for a package.
 *
 * (`TargetConfig` is the type used in the lage.config.js `pipeline` options.
 * `Target` is the processed type used by lage at runtime.)
 */
export interface Target {
  /**
   * Unique ID of the target (e.g. "pkg-a#build")
   */
  id: string;

  /**
   * A display label of the target
   */
  label: string;

  /**
   * Working directory of the target - full path
   */
  cwd: string;

  /**
   * Name of the task for the target (e.g. "build", "test", "lint")
   */
  task: string;

  /**
   * Which runner to use for the target: e.g. `'npmScript'`, `'worker', `'noop'`
   * @default "npmScript"
   */
  type?: string;

  /**
   * Package name of the target. Undefined if this target is associated with repo root.
   */
  packageName?: string;

  /**
   * List of "dependency specs" like "^build", "build", "foo#build"
   */
  depSpecs: string[];

  /**
   * Dependencies of the target - these are the targets that must be complete before the target can be complete
   */
  dependencies: string[];

  /**
   * Dependents of the target - these are the targets that depend on this target
   */
  dependents: string[];

  /**
   * Priority of the target. A priority of >0 will always be prioritized over the default targets in queue.
   */
  priority?: number;

  /**
   * Inputs for this target. This is used to determine the hash key for caching
   */
  inputs?: string[];

  /**
   * Outputs of this target. This is used to determine the files to be stored for caching
   */
  outputs?: string[];

  /**
   * Whether to cache this target
   * @default true
   */
  cache?: boolean;

  /**
   * Override the top-level `environmentGlob` config for this target if it needs different patterns.
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
   */
  weight?: number;

  /**
   * Options specific to this target.
   *
   * Option types for the default runners (`type` values):
   * - `"npmScript"`: `NpmScriptTargetOptions`
   * - `"worker"`: `WorkerTargetOptions`
   * - `"noop"`: n/a
   */
  options?: Record<string, any>;

  /**
   * Whether the target should be displayed by reporters
   */
  hidden?: boolean;

  /**
   * Whether the target should be run
   */
  shouldRun?: boolean;
}
