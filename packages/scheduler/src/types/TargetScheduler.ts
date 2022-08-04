import { TargetGraph } from "@lage-run/target-graph";
import { TargetRunInfo } from "./TargetRunInfo";

export interface TargetScheduler {
  targetRunInfo: Map<string, TargetRunInfo>;
  abort(): void;
  run(root: string, targetGraph: TargetGraph): Promise<TargetScheduler["targetRunInfo"]>;
}
