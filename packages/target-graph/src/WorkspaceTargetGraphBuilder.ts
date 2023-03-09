import { createDependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import { getPackageAndTask, getTargetId } from "./targetId.js";
import { expandDepSpecs } from "./expandDepSpecs.js";

import path from "path";

import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import type { PackageInfos } from "workspace-tools";
import type { TargetConfig } from "./types/TargetConfig.js";
import { TargetGraphBuilder } from "./TargetGraphBuilder.js";
import { TargetFactory } from "./TargetFactory.js";

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
  addTargetConfig(id: string, config: TargetConfig = {}): void {
    // Generates a target definition from the target config
    if (id.startsWith("//") || id.startsWith("#")) {
      const target = this.targetFactory.createGlobalTarget(id, config);
      this.graphBuilder.addTarget(target);
    } else if (id.includes("#")) {
      const { packageName, task } = getPackageAndTask(id);
      const target = this.targetFactory.createPackageTarget(packageName!, task, config);
      this.graphBuilder.addTarget(target);
    } else {
      const packages = Object.keys(this.packageInfos);
      for (const packageName of packages) {
        const task = id;
        const target = this.targetFactory.createPackageTarget(packageName!, task, config);
        this.graphBuilder.addTarget(target);
      }
    }
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
   * @returns
   */
  build(tasks: string[], scope?: string[]) {
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
    }

    const subGraph = this.graphBuilder.subgraph(subGraphEntries);

    return {
      targets: subGraph.targets,
    };
  }
}
