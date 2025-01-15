import { createDependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import { getPackageAndTask, getStagedTargetId, getTargetId } from "./targetId.js";
import { expandDepSpecs } from "./expandDepSpecs.js";

import path from "path";

import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import type { PackageInfos } from "workspace-tools";
import type { Target } from "./types/Target.js";
import type { TargetConfig } from "./types/TargetConfig.js";
import { TargetGraphBuilder } from "./TargetGraphBuilder.js";
import { TargetFactory } from "./TargetFactory.js";
import pLimit from "p-limit";

const DEFAULT_STAGED_TARGET_THRESHOLD = 50;
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
export class WorkspaceTargetGraphBuilder {
  /** A cache of the dependencyMap for packages, used inside dependency expansion */
  private dependencyMap: DependencyMap;

  private graphBuilder: TargetGraphBuilder;

  private targetFactory: TargetFactory;

  private hasRootTarget = false;

  private hasStagedTarget = false;

  private targetConfigMap = new Map<string, TargetConfig>();

  /**
   * Initializes the builder with package infos
   * @param root the root directory of the workspace
   * @param packageInfos the package infos for the workspace
   */
  constructor(root: string, private packageInfos: PackageInfos) {
    this.dependencyMap = createDependencyMap(packageInfos, { withDevDependencies: true, withPeerDependencies: false });
    this.graphBuilder = new TargetGraphBuilder();
    this.targetFactory = new TargetFactory({
      root,
      packageInfos,
      resolve(packageName: string) {
        try {
          return path.dirname(packageInfos[packageName].packageJsonPath);
        } catch (e) {
          throw new Error(`Cannot open package.json file for ${packageName}`);
        }
      },
    });
  }

  /**
   * Generates new `Target`, indexed by the id based on a new target configuration.
   *
   * @param id
   * @param targetDefinition
   */
  async addTargetConfig(id: string, config: TargetConfig = {}, changedFiles?: string[]): Promise<void> {
    // Generates a target definition from the target config
    if (id.startsWith("//") || id.startsWith("#")) {
      const target = this.targetFactory.createGlobalTarget(id, config);
      this.graphBuilder.addTarget(target);
      this.targetConfigMap.set(id, config);
      this.hasRootTarget = true;

      this.processStagedConfig(target, config, changedFiles);
    } else if (id.includes("#")) {
      const { packageName, task } = getPackageAndTask(id);
      const target = this.targetFactory.createPackageTarget(packageName!, task, config);
      this.graphBuilder.addTarget(target);
      this.targetConfigMap.set(id, config);

      this.processStagedConfig(target, config, changedFiles);
    } else {
      const packages = Object.keys(this.packageInfos);
      for (const packageName of packages) {
        const task = id;
        const target = this.targetFactory.createPackageTarget(packageName!, task, config);
        this.graphBuilder.addTarget(target);
        this.targetConfigMap.set(id, config);

        this.processStagedConfig(target, config, changedFiles);
      }
    }
  }

  /**
   * Side effects function on the passed in target
   * @param parentTarget
   * @param config
   */
  async processStagedConfig(parentTarget: Target, config: TargetConfig, changedFiles?: string[]): Promise<void> {
    if (typeof config.stagedTarget === "undefined") {
      return;
    }

    if (
      typeof changedFiles === "undefined" ||
      changedFiles.length === 0 ||
      changedFiles.length > (config.stagedTarget.threshold ?? DEFAULT_STAGED_TARGET_THRESHOLD)
    ) {
      return;
    }

    this.hasStagedTarget = true;

    // First convert the parent to be a NO-OP, not cached, and should run always
    parentTarget.type = "noop";
    parentTarget.cache = false;
    parentTarget.shouldRun = false;

    // Create a staged target for the parent target
    const id = getStagedTargetId(parentTarget.task);
    const stagedTarget = this.graphBuilder.targets.has(id)
      ? this.graphBuilder.targets.get(id)!
      : this.targetFactory.createStagedTarget(parentTarget.task, config.stagedTarget, changedFiles);

    // Add the staged target to the graph
    this.graphBuilder.addTarget(stagedTarget);

    // Add all the parent target dependencies as the staged dependencies as unique set
    const depSet = new Set<string>(stagedTarget.dependencies);
    for (const dep of parentTarget.dependencies) {
      depSet.add(dep);
    }
    stagedTarget.dependencies = Array.from(depSet);

    // If parent target has dependents, we need to throw an error
    if (parentTarget.dependents.length > 0) {
      throw new Error(
        `Parent target ${parentTarget.id} cannot have dependents when it has a staged target while running with a --since flag`
      );
    }
  }

  shouldRun(config: TargetConfig, target: Target): boolean | Promise<boolean> {
    if (typeof config.shouldRun === "function") {
      return config.shouldRun(target);
    }

    return true;
  }

  /**
   * Builds a scoped target graph for given tasks and packages
   *
   * Steps:
   * 1. expands the dependency specs from the target definitions
   * 2. sub-graph filtered from the full dependency graph
   * 3. filtering all targets to just only the ones listed in the sub-graph
   * 4. returns the sub-graph
   *
   * @param tasks
   * @param scope
   * @param priorities the set of global priorities for the workspace.
   */
  async build(tasks: string[], scope?: string[], priorities?: { package?: string; task: string; priority: number }[]): Promise<{
      targets: Map<string, Target>;
  }> {
    // Expands the dependency specs from the target definitions
    const fullDependencies = expandDepSpecs(this.graphBuilder.targets, this.dependencyMap);

    for (const [from, to] of fullDependencies) {
      this.graphBuilder.addDependency(from, to);
    }

    const subGraphEntries: string[] = [];

    for (const task of tasks) {
      if (scope) {
        for (const packageName of scope) {
          subGraphEntries.push(getTargetId(packageName, task));
        }
      } else {
        for (const packageName of Object.keys(this.packageInfos)) {
          subGraphEntries.push(getTargetId(packageName, task));
        }
      }

      if (this.hasRootTarget) {
        const globalTargetId = getTargetId(undefined, task);
        if (this.graphBuilder.targets.has(globalTargetId)) {
          subGraphEntries.push(globalTargetId);
        }
      }

      if (this.hasStagedTarget) {
        const stagedTargetId = getStagedTargetId(task);
        if (this.graphBuilder.targets.has(stagedTargetId)) {
          subGraphEntries.push(stagedTargetId);
        }
      }
    }

    // Add all the global priorities for individual targets
    if (priorities) {
      for (const priorityConfig of priorities) {
        // Right now we are only handling global priorities where the package name is set
        if (priorityConfig.package) {
          const targetId = getTargetId(priorityConfig.package, priorityConfig.task);
          const target = this.graphBuilder.targets.get(targetId);
          if (target) {
            target.priority = target.priority ? Math.max(target.priority, priorityConfig.priority) : priorityConfig.priority;
          }
        }
      }
    }

    const subGraph = this.graphBuilder.subgraph(subGraphEntries);

    const limit = pLimit(8);
    const setShouldRunPromises: Promise<void>[] = [];
    for (const target of subGraph.targets.values()) {
      const config = this.targetConfigMap.get(target.id);
      if (config) {
        setShouldRunPromises.push(
          limit(async () => {
            target.shouldRun = await this.shouldRun(config, target);
          })
        );
      }
    }

    await Promise.all(setShouldRunPromises);

    return {
      targets: subGraph.targets,
    };
  }
}
