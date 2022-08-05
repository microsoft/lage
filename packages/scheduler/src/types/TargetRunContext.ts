import { Target } from "@lage-run/target-graph";
import { TargetRunner } from "./TargetRunner";
import { TargetStatus } from "./TargetStatus";

export interface TargetRunContext {
  startTime: [number, number];
  duration: [number, number];
  target: Target;
  status: TargetStatus;
  run(runner: TargetRunner): Promise<boolean>;
}