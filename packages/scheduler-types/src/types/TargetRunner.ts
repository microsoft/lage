import type { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";

export interface TargetRunnerOptions {
  target: Target;
  abortSignal?: AbortSignal;
}

export interface TargetRunner {
  run(options: TargetRunnerOptions): Promise<void>;
  cleanup?(): Promise<void> | void;
}
