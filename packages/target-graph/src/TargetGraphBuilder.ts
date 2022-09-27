import { createDependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import { getPackageAndTask, getStartTargetId, getTargetId } from "./targetId";

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
  /** Cached transitive task dependency */
  private cachedTransitiveTaskDependencies: Map<string, "walk-in-progress" | Set<string>> = new Map();

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
      dependencies: dependsOn ?? deps ?? [],
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
      dependencies: dependsOn ?? deps ?? [],
      inputs,
      outputs,
      priority,
      run,
      options,
    };
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
   * Expands the dependency graph by adding all transitive dependencies of the given targets.
   */
  private expandDependencies() {
    /**
     * Adds a dependency in the form of [from, to] to the dependency list.
     * @param from
     * @param to
     */
    const addDependency = (from: string, to: string) => {
      this.dependencies.push([from, to]);
      this.targets.get(to)?.dependencies.push(from);
    };

    /**
     * Finds all transitive dependencies, given a task and optionally a dependency list.
     * @param task
     * @param dependencies
     * @returns
     */
    const findDependenciesByTask = (task: string, dependencies?: string[]) => {
      if (!dependencies) {
        return targets.filter((needle) => needle.task === task).map((needle) => needle.id);
      }

      return targets
        .filter((needle) => {
          const { task: needleTask, packageName: needlePackageName } = needle;
          return needleTask === task && dependencies.some((depPkg) => depPkg === needlePackageName);
        })
        .map((needle) => needle.id);
    };

    const targets = [...this.targets.values()];

    for (const target of targets) {
      const { dependencies, packageName, id: to } = target;

      // Always start with a root node with a special "START_TARGET_ID"
      // because any node could potentially be part of the entry point in building the scoped target subgraph
      this.dependencies.push([getStartTargetId(), to]);

      // Skip any targets that have no "deps" specified
      if (!dependencies || dependencies.length === 0) {
        continue;
      }

      /**
       * Now for every deps defined, we need to "interpret" it based on the syntax:
       * - for any deps like package#task, we simply add the singular dependency (source could be a single package or all packages)
       * - for anything that starts with a "^", we add the package-tasks according to the topological package graph
       *    NOTE: in a non-strict mode (TODO), the dependencies can come from transitive task dependencies
       * - for anything that starts with a "^^", we add the package-tasks from the transitive dependencies in the topological
       *    package graph.
       * - for {"pkgA#task": ["dep"]}, we interpret to add "pkgA#dep"
       * - for anything that is a string without a "^", we treat that string as the name of a task, adding all targets that way
       *    NOTE: in a non-strict mode (TODO), the dependencies can come from transitive task dependencies
       *
       * We interpret anything outside of these conditions as invalid
       */
      for (const dependencyTargetId of dependencies) {
        if (dependencyTargetId.includes("#")) {
          // id's with a # are package-task dependencies, or global
          // therefore, we must use getPackageAndTask() & getTargetId() to normalize the target id
          // (e.g. "build": ["build-tool#build"])
          const { packageName, task } = getPackageAndTask(dependencyTargetId);
          const normalizedDependencyTargetId = getTargetId(packageName, task);
          addDependency(normalizedDependencyTargetId, to);
        } else if (dependencyTargetId.startsWith("^^") && packageName) {
          // Transitive depdency (e.g. bundle: ['^^transpile'])
          const depTask = dependencyTargetId.substring(2);
          const targetDependencies = [...(this.getTransitiveGraphDependencies(packageName) ?? [])];
          const dependencyTargetIds = findDependenciesByTask(depTask, targetDependencies);
          for (const from of dependencyTargetIds) {
            addDependency(from, to);
          }
        } else if (dependencyTargetId.startsWith("^") && packageName) {
          // Topological dependency (e.g. build: ['^build'])
          const depTask = dependencyTargetId.substring(1);
          const targetDependencies = [...(this.dependencyMap.dependencies.get(packageName) ?? [])];
          const dependencyTargetIds = findDependenciesByTask(depTask, targetDependencies);
          for (const from of dependencyTargetIds) {
            addDependency(from, to);
          }
        } else if (packageName) {
          // Add dependency on a specific package and given task name as dependency
          // (e.g. bundle: ['build'])
          const task = dependencyTargetId;
          if (this.targets.has(getTargetId(packageName, task))) {
            addDependency(getTargetId(packageName, task), to);
          }
        } else if (!dependencyTargetId.startsWith("^")) {
          // Global dependency - add all targets that match task name as dependency
          // (e.g. "#bundle": ['build'])
          const task = dependencyTargetId;
          const dependencyIds = findDependenciesByTask(task);
          for (const dependencyId of dependencyIds) {
            addDependency(dependencyId, to);
          }
        } else {
          throw new Error(`invalid pipeline config detected: ${target.id}, packageName: ${packageName}, dep: ${dependencyTargetId}`);
        }
      }
    }
  }

  /**
   * Gets a list of package names that are direct or indirect dependencies of rootPackageName in this.graph,
   * and caches them on the Pipeline.
   *
   * For example, this is useful for a bundling target that depends on all transitive dependencies to have been built.
   *
   * @param packageName the root package to begin walking from
   */
  private getTransitiveGraphDependencies(packageName: string): Set<string> {
    const cachedResult = this.cachedTransitiveTaskDependencies.get(packageName);
    if (cachedResult) {
      return cachedResult === "walk-in-progress"
        ? // There is a recursive walk over this set of dependencies in progress.
          // If we hit this case, that means that a dependency of this package depends on it.
          //
          // In this case we return an empty set to omit this package and it's downstream from its
          // dependency
          new Set()
        : // we already computed this for this package, return the cached result.
          cachedResult;
    } else {
      // No cached result. Compute now with a recursive walk

      // mark that we are traversing this package to prevent infinite recursion
      // in cases of circular dependencies
      this.cachedTransitiveTaskDependencies.set(packageName, "walk-in-progress");

      const immediateDependencies = [...(this.dependencyMap.dependencies.get(packageName) ?? [])];

      // build the set of transitive dependencies by recursively walking the
      // immediate dependencies' dependencies.
      const transitiveDepSet = new Set<string>(immediateDependencies);
      for (const immediateDependency of immediateDependencies) {
        for (const transitiveSubDependency of this.getTransitiveGraphDependencies(immediateDependency)) {
          transitiveDepSet.add(transitiveSubDependency);
        }
      }

      // Cache the result and return
      this.cachedTransitiveTaskDependencies.set(packageName, transitiveDepSet);
      return transitiveDepSet;
    }
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
    this.expandDependencies();

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
