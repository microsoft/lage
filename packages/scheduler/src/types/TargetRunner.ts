import { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";

export interface TargetRunner {
  run(target: Target, abortSignal?: AbortSignal): Promise<void>;
}
