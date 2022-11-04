import type { Target } from "@lage-run/target-graph";

export interface TargetRunnerOptions {
  target: Target;
  weight: number;
  abortSignal?: AbortSignal;
}

export interface TargetRunner {
  run(options: TargetRunnerOptions): Promise<void>;
  cleanup?(): Promise<void> | void;
}
