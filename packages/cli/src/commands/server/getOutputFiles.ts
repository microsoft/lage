import type { CacheOptions } from "@lage-run/config";
import { glob } from "@lage-run/globby";
import type { Target } from "@lage-run/target-graph";

export function getOutputFiles(target: Target, outputGlob: CacheOptions["outputGlob"]) {
  const patterns = target.outputs ?? outputGlob ?? ["**/*"];
  return glob(patterns, { cwd: target.cwd, gitignore: true });
}
