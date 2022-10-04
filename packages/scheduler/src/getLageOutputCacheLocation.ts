import type { Target } from "@lage-run/target-graph";
import path from "path";

export function getLageOutputCacheLocation(target: Target, hash: string) {
  const outputPath = path.join(target.cwd, "node_modules/.cache/lage/output/");
  return path.join(outputPath, hash + ".txt");
}
