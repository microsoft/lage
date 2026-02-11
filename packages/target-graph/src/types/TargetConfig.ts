import type { Target } from "./Target.js";

/**
 * Target configuration - to be used inside `lage.config.js` `pipeline` configurations.
 * A "target" is essentially a task for a package.
 *
 * (`Target` is the processed type used by lage at runtime.)
 */
export interface TargetConfig extends Pick<
  Target,
  "type" | "inputs" | "outputs" | "priority" | "cache" | "environmentGlob" | "maxWorkers" | "options"
> {
  /**
   * The dependencies of the target. Dependencies are target specs in one of these forms:
   * - "pkg-a#build"
   * - "build"
   * - "^build"
   * - "^^build"

  * @deprecated - use `dependsOn` instead
   */
  deps?: string[];

  /**
   * The dependencies of the target. Dependencies are target specs in one of these forms:
   * - "pkg-a#build"
   * - "build"
   * - "^build"
   * - "^^build"
   * @see https://microsoft.github.io/lage/docs/guides/pipeline
   */
  dependsOn?: string[];

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
   * An optionally async function that determines whether a target should run or not.
   */
  shouldRun?: (target: Target) => boolean | Promise<boolean>;

  /**
   * Whether this task is one that can be run as a task that runs over a list of git staged files,
   * e.g. `lage run --since origin/master`.
   * When encountering this task, it'll add this single task into the graph instead of package tasks.
   */
  stagedTarget?: StagedTargetConfig;
}

export interface StagedTargetConfig extends Pick<TargetConfig, "type" | "dependsOn" | "priority" | "weight" | "options"> {
  /**
   * A threshold of changed files that determines whether a target should run or not. Target will only run if number of changed files
   * is below this threshold.
   */
  threshold?: number;
}
