import type { Target } from "@lage-run/target-graph";

/** Options passed to a `TargetRunner`'s `run` method */
export interface TargetRunOptions {
  target: Target;
  weight: number;
  abortSignal?: AbortSignal;
}

/** @deprecated Use `TargetRunOptions` */
export type TargetRunnerOptions = TargetRunOptions;

/**
 * Default type for the result returned from a target runner's `run` method.
 */
export interface TargetRunResult {
  exitCode?: number;
  error?: unknown;
}

export interface TargetRunner<T extends TargetRunResult = TargetRunResult> {
  /** Determine whether the target should run */
  shouldRun(target: Target): Promise<boolean>;

  /** Run the target. */
  run(options: TargetRunOptions): Promise<T | void>;

  /** Perform optional cleanup */
  cleanup?(): Promise<void> | void;
}
