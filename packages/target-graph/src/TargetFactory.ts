import type { StagedTargetConfig, TargetConfig } from "./types/TargetConfig.js";
import type { Target } from "./types/Target.js";
import type { PackageInfos } from "workspace-tools";

import { getPackageAndTask, getStagedTargetId, getTargetId } from "./targetId.js";
import { getWeight } from "./getWeight.js";

export interface TargetFactoryOptions {
  root: string;
  packageInfos: PackageInfos;
  resolve(packageName: string): string;
}

export class TargetFactory {
  private packageScripts: Set<string> = new Set<string>();
  private packageScriptsByPackage: Map<string, Set<string>> = new Map<string, Set<string>>();

  constructor(private options: TargetFactoryOptions) {
    const { packageInfos } = options;
    for (const info of Object.values(packageInfos)) {
      const scripts = new Set<string>();
      for (const scriptName of Object.keys(info.scripts ?? {})) {
        this.packageScripts.add(scriptName);
        scripts.add(scriptName);
      }
      this.packageScriptsByPackage.set(info.name, scripts);
    }
  }

  private getTargetType(task: string, config: TargetConfig, packageName?: string): string {
    if (!config.type) {
      // Per-package check: if we know the package, check if THIS package has the script.
      // Falls back to global check for non-package targets or when packageName is not provided.
      if (packageName) {
        return this.packageScriptsByPackage.get(packageName)?.has(task) ? "npmScript" : "noop";
      }
      return this.packageScripts.has(task) ? "npmScript" : "noop";
    }

    return config.type;
  }

  /**
   * Creates a package task `Target`
   */
  public createPackageTarget(packageName: string, task: string, config: TargetConfig): Target {
    const { resolve } = this.options;
    const { options, deps, dependsOn, cache, inputs, priority, maxWorkers, environmentGlob, weight } = config;
    const cwd = resolve(packageName);

    const targetType = this.getTargetType(task, config, packageName);

    const target = {
      id: getTargetId(packageName, task),
      label: `${packageName} - ${task}`,
      type: targetType,
      packageName,
      task,
      cache: cache !== false,
      cwd,
      depSpecs: dependsOn ?? deps ?? [],
      dependencies: [],
      dependents: [],
      inputs,
      outputs: targetType === "noop" ? [] : config.outputs,
      priority,
      maxWorkers,
      environmentGlob,
      weight: 1,
      options,
      shouldRun: true,
    };

    target.weight = getWeight(target, weight, maxWorkers);

    return target;
  }

  public createGlobalTarget(id: string, config: TargetConfig): Target {
    const { root } = this.options;
    const { options, deps, dependsOn, cache, inputs, outputs, priority, maxWorkers, environmentGlob, weight } = config;
    const { task } = getPackageAndTask(id);
    const target = {
      id,
      label: id,
      type: this.getTargetType(task, config),
      task,
      cache: cache !== false,
      cwd: root,
      depSpecs: dependsOn ?? deps ?? [],
      dependencies: [],
      dependents: [],
      inputs,
      outputs,
      priority,
      maxWorkers,
      environmentGlob,
      weight: 1,
      options,
      shouldRun: true,
    };

    target.weight = getWeight(target, weight, maxWorkers);

    return target;
  }

  /**
   * Creates a target that operates on files that are "staged" (git index)
   */
  public createStagedTarget(task: string, config: StagedTargetConfig, changedFiles: string[]): Target {
    const { root } = this.options;
    const { dependsOn, priority } = config;

    // Clone & modify the options to include the changed files as taskArgs
    const options = { ...config.options };

    switch (config.type) {
      case "noop":
        break;

      default:
        options.taskArgs = options.taskArgs ?? [];
        options.taskArgs.push(...changedFiles);
        break;
    }

    const id = getStagedTargetId(task);
    const target = {
      id,
      label: id,
      type: config.type,
      task,
      cache: false,
      cwd: root,
      depSpecs: dependsOn ?? [],
      dependencies: [],
      dependents: [],
      inputs: [],
      outputs: [],
      priority,
      maxWorkers: 1,
      environmentGlob: [],
      weight: 1,
      options,
      shouldRun: true,
    };

    return target;
  }
}
