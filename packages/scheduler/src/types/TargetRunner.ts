import { Target } from "@lage-run/target-graph";
import type { AbortSignal } from "abort-controller";
import { Transform } from "stream";

export interface TargetCaptureStreams {
  stdout?: Transform;
  stderr?: Transform;
}

export interface TargetRunner {
  run(target: Target, abortSignal?: AbortSignal, captureStreams?: TargetCaptureStreams): Promise<void>;
  cleanup?(): Promise<void> | void;
}
