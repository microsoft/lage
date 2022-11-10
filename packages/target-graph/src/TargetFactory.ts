import type { TargetConfig } from "./types/TargetConfig.js";
import type { Target } from "./types/Target.js";

import { getPackageAndTask, getTargetId } from "./targetId.js";
import { getWeight } from "./getWeight.js";

export interface TargetFactoryOptions {
  root: string;
  resolve(packageName: string): string;
}

export class TargetFactory {
  constructor(private options: TargetFactoryOptions) {}

  /**
   * Creates a package task `Target`
   * @param packageName
   * @param task
   * @param config
   * @returns a package task `Target`
   */
  createPackageTarget(packageName: string, task: string, config: TargetConfig): Target {
    const { resolve } = this.options;
    const { options, deps, dependsOn, cache, inputs, outputs, priority, maxWorkers, environmentGlob, weight } = config;
    const cwd = resolve(packageName);

    const target = {
      id: getTargetId(packageName, task),
      label: `${packageName} - ${task}`,
      type: config.type,
      packageName,
      task,
      cache: cache !== false,
      cwd,
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
    };

    target.weight = getWeight(target, weight, maxWorkers);

    return target;
  }

  createGlobalTarget(id: string, config: TargetConfig): Target {
    const { root } = this.options;
    const { options, deps, dependsOn, inputs, outputs, priority, maxWorkers, environmentGlob, weight } = config;
    const { task } = getPackageAndTask(id);
    const target = {
      id,
      label: id,
      type: config.type,
      task,
      cache: false,
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
    };

    target.weight = getWeight(target, weight, maxWorkers);

    return target;
  }
}
