export interface Target {
  /**
   * Unique ID of the target (e.g. "pkg-a#build")
   */
  id: string;
  label: string;
  cwd: string;
  task: string;

  /**
   * Package name of the target. Undefined if this target is associated with repo root.
   */
  packageName?: string;

  /**
   * Dependencies of the target - these are the targets that must be complete before the target can be complete
   */
  dependencies: string[];

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
   * Run options for the Target
   */
  options?: Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */;

  /**
   * Whether the target should be displayed by reporters
   */
  hidden?: boolean;

  /**
   * Custom run definition, if left blank, the scheduler will decide which runner to use to fulfill the work for the `Target`
   */
  run?: (target: Target) => Promise<void> | void;
}
