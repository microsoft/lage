import type { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";
import type { Transform } from "stream";

export interface TargetRunnerOptions {
  target: Target;
  abortSignal?: AbortSignal;
  shardIndex?: number;
  shardCount?: number;
}

export interface TargetRunner {
  run(options: TargetRunnerOptions): Promise<void>;
  cleanup?(): Promise<void> | void;
}
