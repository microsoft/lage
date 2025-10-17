import { type Target } from "@lage-run/target-graph";
import { type DependencyMap } from "workspace-tools";

export function expandInputPatterns(patterns: string[], target: Target, dependencyMap: DependencyMap): Record<string, string[]> {
  const expandedPatterns: Record<string, string[]> = {};

  for (const pattern of patterns) {
    if (pattern.startsWith("^") || pattern.startsWith("!^")) {
      const matchPattern = pattern.replace("^", "");

      // get all the packages that are transitive deps and add them to the list
      const queue = [target.packageName];

      const visited = new Set<string>();

      while (queue.length > 0) {
        const pkg = queue.pop()!;
        if (visited.has(pkg)) {
          continue;
        }
        visited.add(pkg);

        if (pkg !== target.packageName) {
          expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
          expandedPatterns[pkg].push(matchPattern);
        }

        if (dependencyMap.dependencies.has(pkg)) {
          const deps = dependencyMap.dependencies.get(pkg);
          if (deps) {
            for (const dep of deps) {
              queue.push(dep);
            }
          }
        }
      }
    } else if (pattern.includes("#")) {
      // In this case they specified a specific package which an input file will be pulled from
      // Note that if the path starts with '#' the pkg is caluclated as "" and the file is resolved
      // relative to the root workspace
      const [pkg, matchPattern] = pattern.split("#");
      expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
      expandedPatterns[pkg].push(matchPattern);
    } else {
      const pkg = target.packageName!;
      expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
      expandedPatterns[pkg].push(pattern);
    }
  }

  return expandedPatterns;
}
