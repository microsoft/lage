import { TargetGraph } from "@lage-run/target-graph";
import { TargetRunContext } from "./TargetRunContext";

export interface TargetScheduler {
  targetRunContexts: Map<string, TargetRunContext>;
  abort(): void;
  run(root: string, targetGraph: TargetGraph): Promise<TargetScheduler["targetRunContexts"]>;
}
