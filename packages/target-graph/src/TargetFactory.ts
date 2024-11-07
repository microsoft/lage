import type { TargetConfig } from "./types/TargetConfig.js";
import type { Target } from "./types/Target.js";
import type { PackageInfos } from "workspace-tools";

import { getPackageAndTask, getTargetId } from "./targetId.js";
import { getWeight } from "./getWeight.js";

export interface TargetFactoryOptions {
  root: string;
  packageInfos: PackageInfos;
  resolve(packageName: string): string;
}

export class TargetFactory {
  packageScripts = new Set<string>();

  constructor(private options: TargetFactoryOptions) {
    const { packageInfos } = options;
    for (const info of Object.values(packageInfos)) {
      for (const scriptName of Object.keys(info.scripts ?? {})) {
        this.packageScripts.add(scriptName);
      }
    }
  }

  getTargetType(task: string, config: TargetConfig) {
    if (!config.type) {
      if (this.packageScripts.has(task)) {
        return "npmScript";
      } else {
        return "noop";
      }
    }

    return config.type;
  }

  /**
   * Creates a package task `Target`
   * @param packageName
   * @param task
   * @param config
   * @returns a package task `Target`
   */
  async createPackageTarget(packageName: string, task: string, config: TargetConfig): Promise<Target> {
    const { resolve } = this.options;
    const { options, deps, dependsOn, cache, inputs, priority, maxWorkers, environmentGlob, weight } = config;
    const cwd = resolve(packageName);

    const targetType = this.getTargetType(task, config);

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
    target.shouldRun = await this.shouldRun(config, target);

    return target;
  }

  async createGlobalTarget(id: string, config: TargetConfig): Promise<Target> {
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
    target.shouldRun = await this.shouldRun(config, target);

    return target;
  }

  shouldRun(config: TargetConfig, target: Target) {
    if (typeof config.shouldRun === "function") {
      return config.shouldRun(target);
    }

    return true;
  }
}
