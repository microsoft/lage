import { type ConfigOptions } from "@lage-run/config";
import { type TargetRunnerPicker } from "@lage-run/runners";
import { type TargetGraph } from "@lage-run/target-graph";
import { type PackageInfos } from "workspace-tools";

function optimizeTargetGraph(graph: TargetGraph, runnerPicker: TargetRunnerPicker, packageInfos: PackageInfos, config: ConfigOptions) {
  const targets = graph.targets;

  // const packageTasks = new Map<string, PackageTask[]>(); // Initialize the map with the correct type
  // const dependenciesCache = new Map<string, string[]>();

  // for (const target of targets.values()) {
  //   if (shouldSkipTarget(target, packageInfos)) {
  //     continue;
  //   }

  //   const packageTask = generatePackageTask(target, targets, packageInfos, dependenciesCache, config);
  //   if (packageTask) {
  //     // Check if the packageTask is defined before accessing its properties
  //     const packageName = packageTask.package;
  //     if (!packageTasks.has(packageName)) {
  //       packageTasks.set(packageName, []);
  //     }
  //     packageTasks.get(packageName)!.push(packageTask); // Use the non-null assertion operator to avoid type errors
  //   }
  // }

  // return packageTasks;
}
