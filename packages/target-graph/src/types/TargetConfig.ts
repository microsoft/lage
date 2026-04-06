import type { Target } from "./Target.js";

/**
 * Target configuration - to be used inside `lage.config.js` `pipeline` configurations.
 * A "target" is essentially a task for a package.
 *
 * (`Target` is the processed type used by lage at runtime.)
 */
export interface TargetConfig extends Pick<
  Target,
  "type" | "inputs" | "outputs" | "priority" | "cache" | "skipRemoteCache" | "environmentGlob" | "maxWorkers" | "options"
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
   * Function that determines whether a target should run or not.
   */
  shouldRun?: (target: Target) => boolean | Promise<boolean>;

  /**
   * Optional config for a "staged" version of this target: with the `--since` flag, this version
   * of the target will run instead of the original when the number of changed files is below
   * `stagedTarget.threshold`.
   *
   * "Changed files" includes files that are staged, unstaged, untracked, and changed in the
   * current commit compared to the target branch.
   */
  stagedTarget?: StagedTargetConfig;
}

export interface StagedTargetConfig extends Pick<TargetConfig, "type" | "dependsOn" | "priority" | "weight" | "options"> {
  /**
   * Only use the staged version of the target if the number of changed files is below this threshold.
   * @default 50
   */
  // The default is defined in WorkspaceTargetGraphBuilder DEFAULT_STAGED_TARGET_THRESHOLD
  threshold?: number;
}
