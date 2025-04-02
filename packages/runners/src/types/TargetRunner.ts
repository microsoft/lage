import type { Target } from "@lage-run/target-graph";

export interface TargetRunnerOptions {
  target: Target;
  weight: number;
  abortSignal?: AbortSignal;
}

export interface RunnerResult {
  exitCode?: number;
}

export interface TargetRunner<T extends RunnerResult = RunnerResult> {
  shouldRun(target: Target): Promise<boolean>;
  run(options: TargetRunnerOptions): Promise<T | void>;
  cleanup?(): Promise<void> | void;
}
