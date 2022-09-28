import { createDependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import { getPackageAndTask, getStartTargetId, getTargetId } from "./targetId";
import { prioritize } from "./prioritize";
import { expandDepSpecs } from "./expandDepSpecs";

import path from "path";

import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import type { PackageInfos } from "workspace-tools";
import type { Target } from "./types/Target";
import type { TargetConfig } from "./types/TargetConfig";

/**
 * TargetGraphBuilder class provides a builder API for registering target configs. It exposes a method called `generateTargetGraph` to
 * generate a topological graph of targets (package + task) and their dependencies.
 *
 * Usage:
 *
 * ```typescript
 * const rootDir = process.cwd();
 * const packageInfos = getPackageInfos(rootDir);
 * const builder = new TargetGraphBuilder(rootDir, packageInfos);
 * const targetGraph = builder.buildTargetGraph([...packages], [...tasks]);
 * ```
 */
export class TargetGraphBuilder {
  /** A map of targets - used internally for looking up generated targets from the target configurations */
  private targets: Map<string, Target> = new Map();

  /** List of target to target dependency, represents the _full_ target graph during dependency expansion */
  private dependencies: [string, string][] = [];

  /** A cache of the dependencyMap for packages, used inside dependency expansion */
  private dependencyMap: DependencyMap;

  /**
   * Initializes the builder with package infos
   * @param root the root directory of the workspace
   * @param packageInfos the package infos for the workspace
   */
  constructor(private root: string, private packageInfos: PackageInfos) {
    this.dependencyMap = createDependencyMap(packageInfos, { withDevDependencies: true, withPeerDependencies: false });
  }

  /**
   * Creates a global `Target`
   * @param id
   * @param config
   * @returns a generated global Target
   */
  private createGlobalTarget(id: string, config: TargetConfig): Target {
    const { options, dependsOn, deps, inputs, outputs, priority, run } = config;
    const { task } = getPackageAndTask(id);
    const targetId = getTargetId(undefined, task);
    return {
      id: targetId,
      label: targetId,
      type: config.type,
      task,
      // TODO: backfill currently cannot cache global targets!
      // NOTE: We should force cache inputs to be defined for global targets
      cache: false,
      cwd: this.root,
      dependencies: [],
      dependents: [],
      depSpecs: [],
      inputs,
      outputs,
      priority,
      run,
      options,
    };
  }

  /**
   * Creates a package task `Target`
   * @param packageName
   * @param task
   * @param config
   * @returns a package task `Target`
   */
  private createPackageTarget(packageName: string, task: string, config: TargetConfig): Target {
    const { options, dependsOn, deps, cache, inputs, outputs, priority, run } = config;
    const info = this.packageInfos[packageName];
    return {
      id: getTargetId(packageName, task),
      label: `${packageName} - ${task}`,
      type: config.type,
      packageName,
      task,
      cache: cache !== false,
      cwd: path.dirname(info.packageJsonPath),
      depSpecs: dependsOn ?? deps ?? [],
      dependencies: [],
      dependents: [],
      inputs,
      outputs,
      priority,
      run,
      options,
    };
  }

  /**
   * Filters out targets that are not part of the entry point.
   * @param tasks
   * @param scope
   * @returns a list of target to target dependencies
   */
  private createSubGraph(tasks: string[], scope?: string[]) {
    const targetGraph: [string, string][] = [];
    const knownDeps = new Set<string>();

    const knownDepsKey = (from: string, to: string) => {
      return `${from}->${to}`;
    };

    const addTargetGraphEdge = (from: string, to: string) => {
      if (knownDeps.has(knownDepsKey(from, to))) {
        return;
      }
      knownDeps.add(knownDepsKey(from, to));
      targetGraph.push([from, to]);
    };

    const queue: string[] = [];

    if (!scope) {
      scope = Object.keys(this.packageInfos);
    }

    for (const task of tasks) {
      // package task
      for (const pkg of scope) {
        if (this.targets.has(getTargetId(pkg, task))) {
          queue.push(getTargetId(pkg, task));
          addTargetGraphEdge(getStartTargetId(), getTargetId(pkg, task));
        }
      }

      // if we have global targets, send those into the queue
      for (const target of this.targets.values()) {
        if (target.task === task && !target.packageName) {
          queue.push(target.id);
          addTargetGraphEdge(getStartTargetId(), target.id);
        }
      }
    }

    const visited = new Set<string>();

    while (queue.length > 0) {
      const id = queue.shift()!;

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);

      for (const [from, to] of this.dependencies) {
        if (to === id) {
          // dedupe the targetGraph edges
          if (targetGraph.find(([fromId, toId]) => fromId === from && toId === to) === undefined) {
            addTargetGraphEdge(from, to);
          }

          if (from) {
            queue.push(from);
          }
        }
      }
    }

    return targetGraph;
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
      const target = this.createGlobalTarget(id, config);
      this.targets.set(target.id, target);
    } else if (id.includes("#")) {
      const { packageName, task } = getPackageAndTask(id);
      const target = this.createPackageTarget(packageName!, task, config);
      this.targets.set(target.id, target);
    } else {
      const packages = Object.keys(this.packageInfos);
      for (const packageName of packages) {
        const task = id;
        const target = this.createPackageTarget(packageName!, task, config);
        this.targets.set(target.id, target);
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
  buildTargetGraph(tasks: string[], scope?: string[]) {
    this.dependencies = expandDepSpecs(this.targets, this.dependencyMap);
    prioritize(this.targets);

    const startId = getStartTargetId();
    this.targets.set(startId, {
      id: startId,
      task: startId,
      cwd: "",
      label: "Start",
      hidden: true,
    } as Target);

    const subGraphEdges = this.createSubGraph(tasks, scope);
    const subGraphTargets: Map<string, Target> = new Map();

    for (const [from, to] of subGraphEdges) {
      if (this.targets.has(from)) {
        subGraphTargets.set(from, this.targets.get(from)!);
      }

      if (this.targets.has(to)) {
        subGraphTargets.set(to, this.targets.get(to)!);
      }
    }

    return {
      targets: subGraphTargets,
      dependencies: subGraphEdges,
    };
  }
}
