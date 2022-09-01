import type { Target } from "./Target";

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
   * Run options for the Target. (e.g. `{ env: ...process.env, colors: true, ... }`)
   */
  options?: Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */;

  /**
   * Custom run definition, if left blank, the scheduler will decide which runner to use to fulfill the work for the `Target`
   */
  run?: (target: Target) => Promise<void> | void;
}
