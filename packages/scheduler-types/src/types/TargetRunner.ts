import type { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";
import type { Transform } from "stream";

export interface TargetCaptureStreams {
  stdout?: Transform;
  stderr?: Transform;
}

export interface TargetRunner {
  run(target: Target, abortSignal?: AbortSignal, captureStreams?: TargetCaptureStreams): Promise<void>;
  cleanup?(): Promise<void> | void;
}
