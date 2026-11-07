/** Shared options passed when running a *specific* target */
export interface SharedTargetOptions {
  /**
   * Arguments for the target script or worker. This is used by the built-in `npmScript` and
   * `worker` runners but could also be read by custom runners.
   * (In the case of a staged target, the list of changed files will be added here.)
   */
  taskArgs?: string[];
}

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
   * Which runner to use for the target: e.g. `'npmScript'`, `'worker'`, `'noop'`
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
   * Priority of the target. A priority of \>0 will always be prioritized over the default targets in queue.
   */
  priority?: number;

  /**
   * Glob patterns for files used to determine the hash key for caching.
   *
   * Patterns are relative to the package directory, or to the repository root for a root target.
   * Prefix a pattern with `^` to apply it relative to each transitive package dependency instead
   * (for example, `^src/index.ts`). Input patterns cannot traverse to a parent directory.
   */
  // These are handled by getInputFiles, which also expands sibling-package patterns.
  inputs?: string[];

  /**
   * Glob patterns for files to store in the cache. Patterns are relative to the package directory,
   * or to the repository root for a root target, and must not traverse to a parent directory.
   */
  // These are usually handled by CacheStorage, or by getOutputFiles with lage service.
  // Traversing with .. might currently work in some cases, but it's not consistent and not designed
  // to be supported: globby@11 accepts ../ and returns paths such as ../sibling/output.js, because
  // CacheStorage evaluates output patterns from target.cwd without rejecting traversal.
  // However, LocalCacheStorage preserves the returned ../ while constructing cache paths, potentially
  // writing outside the hash’s cache directory; such files then will not be restored normally.
  // Potentially in the future, patterns traversing outside the package should be explicitly rejected.
  outputs?: string[];

  /**
   * Whether to cache this target
   * @default true
   */
  cache?: boolean;

  /**
   * Whether to skip remote cache for this target. Has no effect when `cache` is `false`.
   * @default false
   */
  skipRemoteCache?: boolean;

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
  options?: SharedTargetOptions & Record<string, unknown>;

  /**
   * Whether the target should be displayed by reporters
   */
  hidden?: boolean;

  /**
   * Whether the target should be run
   */
  shouldRun?: boolean;
}
