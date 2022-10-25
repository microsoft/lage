export interface Target {
  /**
   * Unique ID of the target (e.g. "pkg-a#build")
   */
  id: string;
  label: string;
  cwd: string;
  task: string;

  /**
   * Type of the target. If not specified, it will default to "npmScript". Determines the runner for the target.
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
   * Any custom priority for the target. A priority of >0 will always be prioritized over the default targets in queue
   */
  priority?: number;

  /**
   * Outputs of this target (for cache purposes)
   */
  outputs?: string[];

  /**
   * Inputs for this target (for cache purposes)
   */
  inputs?: string[];

  /**
   * Whether to cache this target
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
   * Run options for the Target
   */
  options?: Record<string, any>;

  /**
   * Whether the target should be displayed by reporters
   */
  hidden?: boolean;
}
