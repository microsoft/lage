import { getPackageAndTask, getStartTargetId, getTargetId } from "./targetId.js";
import { prioritize } from "./prioritize.js";

import path from "path";

import type { Target } from "./types/Target.js";
import type { TargetConfig } from "./types/TargetConfig.js";

/**
 * TargetGraphBuilder class provides a builder API for registering target configs. It exposes a method called `generateTargetGraph` to
 * generate a topological graph of targets (package + task) and their dependencies.
 *
 * Usage:
 *
 * ```typescript
 * const rootDir = process.cwd();
 * const packageInfos = getPackageInfos(rootDir);
 * const builder = new WorkspaceTargetGraphBuilder(rootDir, packageInfos);
 * const targetGraph = builder.buildTargetGraph([...packages], [...tasks]);
 * ```
 */
export class TargetGraphBuilder {
  /** A map of targets - used internally for looking up generated targets from the target configurations */
  private targets: Map<string, Target> = new Map();

  /**
   * Initializes the builder with package infos
   * @param root the root directory of the workspace
   * @param packageInfos the package infos for the workspace
   */
  constructor(private root: string) {
    const startId = getStartTargetId();
    this.targets.set(startId, {
      id: startId,
      task: startId,
      cwd: "",
      label: "Start",
      hidden: true,
      dependencies: [],
      dependents: [],
      depSpecs: [],
      weight: 1,
    } as Target);
  }

  /**
   * Creates a global `Target`
   * @param id
   * @param config
   * @returns a generated global Target
   */
  addGlobalTarget(id: string, config: TargetConfig): Target {
    const { options, inputs, outputs, priority, maxWorkers, environmentGlob } = config;
    const { task } = getPackageAndTask(id);
    const targetId = getTargetId(undefined, task);
    const target = {
      id: targetId,
      label: targetId,
      type: config.type,
      task,
      // TODO: backfill currently cannot cache global targets!
      // NOTE: We should force cache inputs to be defined for global targets
      cache: false,
      cwd: this.root,
      depSpecs: [],
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

    this.targets.set(target.id, target);
    this.addDependency(getStartTargetId(), target.id);

    return target;
  }

  /**
   * Creates a package task `Target`
   * @param packageName
   * @param task
   * @param config
   * @returns a package task `Target`
   */
  addPackageTarget(packageName: string, task: string, config: TargetConfig): Target {
    const { options, cache, inputs, outputs, priority, maxWorkers, environmentGlob } = config;
    const cwd = path.relative(this.root, path.dirname(require.resolve(path.join(packageName, "package.json"), { paths: [this.root] })));
    const target = {
      id: getTargetId(packageName, task),
      label: `${packageName} - ${task}`,
      type: config.type,
      packageName,
      task,
      cache: cache !== false,
      cwd,
      depSpecs: [],
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

    this.targets.set(target.id, target);
    this.addDependency(getStartTargetId(), target.id);

    return target;
  }

  addDependency(from: string, to: string) {
    this.targets.get(to)?.dependencies.push(from);
    this.targets.get(from)?.dependents.push(to);
  }

  /**
   * Builds a target graph for given tasks and packages
   */
  build() {
    // The full graph might produce a different aggregated priority value for a target
    prioritize(this.targets);

    return {
      targets: this.targets,
    };
  }
}
