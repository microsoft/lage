import { Target } from "@lage-run/target-graph";

export interface TargetRunner {
  abort(): void;
  run(target: Target): Promise<boolean>;
}