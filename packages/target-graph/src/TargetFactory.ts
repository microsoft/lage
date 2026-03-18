import type { PackageInfos } from "workspace-tools";
import { builtInTargetTypes } from "./builtInTargetTypes.js";
import { getWeight } from "./getWeight.js";
import { getPackageAndTask, getStagedTargetId, getTargetId } from "./targetId.js";
import type { Target } from "./types/Target.js";
import type { StagedTargetConfig, TargetConfig } from "./types/TargetConfig.js";

export interface TargetFactoryOptions {
  root: string;
  packageInfos: PackageInfos;
  resolve(packageName: string): string;
}

export class TargetFactory {
  /** All scripts found in any package (not counting the root package) */
  private packageScripts: Set<string> = new Set<string>();

  constructor(private options: TargetFactoryOptions) {
    const { packageInfos } = options;
    for (const info of Object.values(packageInfos)) {
      for (const scriptName of Object.keys(info.scripts ?? {})) {
        this.packageScripts.add(scriptName);
      }
    }
  }

  private getTargetType(task: string, config: TargetConfig): string {
    // If the target doesn't define a type, return npmScript if any package in the repo has that script.
    //
    // TODO: This is a bit silly that we check all the scripts in the repo rather than verifying
    // the actual package, since we do have that info. Checking here would allow removing the
    // extra file read for script existence check in NpmScriptRunner, and potentially allow
    // the target graph optimization step to be moved into this package (maybe under a flag).
    //
    // Edge cases if this is tried in the future:
    // - For global targets, we might need to look at the root package.json, which isn't included in
    //   packageInfos and would have to be plumbed through or read separately.
    // - In NpmScriptRunner (runners package) there's an alternate way of specifying the script via
    //   NpmScriptRunnerOptions.script. The best approach to avoid losing type safety might be to
    //   move the <Type>TargetOptions types for built-in runners to this package--the parts of this
    //   package used by WorkspaceTargetGraphBuilder already have other built-in runner logic despite
    //   the theoretical division.
    return config.type || (this.packageScripts.has(task) ? builtInTargetTypes.npmScript : builtInTargetTypes.noop);
  }

  /**
   * Creates a package task `Target`
   */
  public createPackageTarget(packageName: string, task: string, config: TargetConfig): Target {
    const targetType = this.getTargetType(task, config);

    const target: Target = {
      id: getTargetId(packageName, task),
      label: `${packageName} - ${task}`,
      type: targetType,
      packageName,
      task,
      cache: config.cache !== false,
      cwd: this.options.resolve(packageName),
      depSpecs: config.dependsOn ?? config.deps ?? [],
      dependencies: [],
      dependents: [],
      inputs: config.inputs,
      outputs: targetType === builtInTargetTypes.noop ? [] : config.outputs,
      priority: config.priority,
      maxWorkers: config.maxWorkers,
      environmentGlob: config.environmentGlob,
      weight: 1,
      options: config.options,
      shouldRun: true,
    };

    target.weight = getWeight(target, config.weight, config.maxWorkers);

    return target;
  }

  public createGlobalTarget(id: string, config: TargetConfig): Target {
    const { task } = getPackageAndTask(id);
    const target: Target = {
      id,
      label: id,
      type: this.getTargetType(task, config),
      task,
      cache: config.cache !== false,
      cwd: this.options.root,
      depSpecs: config.dependsOn ?? config.deps ?? [],
      dependencies: [],
      dependents: [],
      inputs: config.inputs,
      outputs: config.outputs,
      priority: config.priority,
      maxWorkers: config.maxWorkers,
      environmentGlob: config.environmentGlob,
      weight: 1,
      options: config.options,
      shouldRun: true,
    };

    target.weight = getWeight(target, config.weight, config.maxWorkers);

    return target;
  }

  /**
   * Creates a target that operates on files that are "staged" (changed in git vs `--since`)
   */
  public createStagedTarget(task: string, config: StagedTargetConfig, changedFiles: string[]): Target {
    // Clone & modify the options to include the changed files as taskArgs
    const options = { ...config.options };

    if (config.type !== builtInTargetTypes.noop) {
      // Clone any taskArgs and add the staged files
      options.taskArgs = [...(options.taskArgs ?? []), ...changedFiles];
    }

    const id = getStagedTargetId(task);
    const target: Target = {
      id,
      label: id,
      type: config.type,
      task,
      cache: false,
      cwd: this.options.root,
      depSpecs: config.dependsOn ?? [],
      dependencies: [],
      dependents: [],
      inputs: [],
      outputs: [],
      priority: config.priority,
      maxWorkers: 1,
      environmentGlob: [],
      weight: 1,
      options,
      shouldRun: true,
    };

    return target;
  }
}
