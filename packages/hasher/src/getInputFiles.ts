import { type Target } from "@lage-run/target-graph";
import { type DependencyMap } from "workspace-tools";
import { type PackageTree } from "./PackageTree.js";
import { expandInputPatterns } from "./expandInputPatterns.js";

export function getInputFiles(target: Target, dependencyMap: DependencyMap, packageTree: PackageTree) {
  const inputs = target.inputs ?? ["**/*"];

  const packagePatterns = expandInputPatterns(inputs, target, dependencyMap);
  const files: string[] = [];
  for (const [pkg, patterns] of Object.entries(packagePatterns)) {
    const packageFiles = packageTree.getPackageFiles(pkg, patterns);
    files.push(...packageFiles);
  }
  return files;
}
