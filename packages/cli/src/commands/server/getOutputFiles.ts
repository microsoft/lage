import type { CacheOptions } from "@lage-run/config";
import { glob } from "@lage-run/globby";
import type { PackageTree } from "@lage-run/hasher";
import type { Target } from "@lage-run/target-graph";

import path from "path";

export function getOutputFiles(root: string, target: Target, outputGlob: CacheOptions["outputGlob"], packageTree: PackageTree): string[] {
  const patterns = target.outputs ?? outputGlob ?? ["**/*"];

  const sourceControlledFiles = new Set(packageTree.getPackageFiles(target.packageName ?? "", patterns));
  const outputs = glob(patterns, { cwd: target.cwd, gitignore: false })
    .map((file) => path.relative(root, path.join(target.cwd, file)))
    .filter((file) => !sourceControlledFiles.has(file));

  return outputs;
}
