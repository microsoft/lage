import { Target } from "@lage-run/target-graph";

export interface TargetRunner {
  run(target: Target): Promise<boolean>;
}