import { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";
import { Transform } from "stream";
export interface TargetRunOptions {
  cachedStdoutStream?: Transform;
  cachedStderrStream?: Transform;
}
export interface TargetRunner {
  run(target: Target, abortSignal?: AbortSignal, options?: TargetRunOptions): Promise<void>;
}
