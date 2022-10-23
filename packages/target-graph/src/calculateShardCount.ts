import type { Target } from "./types/Target";
import type { TargetConfig } from "./types/TargetConfig";

export function calculateShardCount(target: Target, shards: TargetConfig["shards"]) {
  if (typeof shards === "undefined") {
    return 1;
  }

  if (typeof shards === "function") {
    return shards(target);
  }

  return shards;
}
