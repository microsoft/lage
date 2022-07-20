// TODO: move types out to an export from root
import { createDependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import { getPackageAndTask, getTargetId } from "./targetId";
import { TargetConfig } from "./types/TargetConfig";
import path from "path";
import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap";
import type { PackageInfos } from "workspace-tools";
import type { Target } from "./types/Target";
import { npmScriptRunner } from "./runners/npmScriptRunner";

export const START_TARGET_ID = "__start";

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
 * const targetGraph = builder.build();
 * ```
 */
export class TargetGraphBuilder {
  private cachedTransitiveTaskDependencies: Map<string, "walk-in-progress" | Set<string>> = new Map();

  private targets: Map<string, Target> = new Map();
  private dependencies: [string, string][] = [];
  private dependencyMap: DependencyMap;

  constructor(private root: string, private packageInfos: PackageInfos) {
    this.dependencyMap = createDependencyMap(packageInfos, { withDevDependencies: true, withPeerDependencies: false });
  }

  /**
   * Adds a target definition
   * @param id
   * @param targetDefinition
   */
  addTargetConfig(id: string, config: TargetConfig = {}): void {
    // Generates a target definition from the target config
    if (config.type === "global" || id.startsWith("//")) {
      const targetId = id;
      const options = { ...config.options };

      this.targets.set(targetId, {
        id: targetId,
        label: targetId,
        task: targetId,
        cache: config.cache !== false,
        cwd: this.root,
        dependencies: config.dependsOn ?? config.deps ?? [],
        status: "pending",
        inputs: config.inputs,
        outputs: config.outputs,
        priority: config.priority,
        run: config.run,
        options,
      });
    } else if (id.includes("#")) {
      const { packageName: pkg, task } = getPackageAndTask(id);
      const options = {
        packageName: pkg as string,
        task,
        ...config.options,
      };
      const info = this.packageInfos[options.packageName];
      const target: Target = {
        id,
        label: `${pkg} - ${task}`,
        task,
        cache: config.cache !== false,
        cwd: path.dirname(info.packageJsonPath),
        dependencies: config.dependsOn ?? config.deps ?? [],
        status: "pending",
        inputs: config.inputs,
        outputs: config.outputs,
        priority: config.priority,
        options,
        run: config.run,
      };

      this.targets.set(id, target);
    } else {
      const packages = Object.keys(this.packageInfos);
      for (const pkg of packages) {
        const targetId = getTargetId(pkg, id);
        const options = {
          packageName: pkg as string,
          task: id,
          ...config.options,
        };
        const target: Target = {
          id: targetId,
          label: `${pkg} - ${id}`,
          task: id,
          cache: config.cache !== false,
          cwd: this.root,
          dependencies: config.dependsOn ?? config.deps ?? [],
          packageName: pkg as string,
          status: "pending",
          inputs: config.inputs,
          outputs: config.outputs,
          priority: config.priority,
          options,
          run: config.run,
        };
        this.targets.set(targetId, target);
      }
    }
  }

  /**
   * Adds all the target dependencies to the graph
   */
  private expandDependencies() {
    const targets = [...this.targets.values()];
    for (const target of targets) {
      const { dependencies, packageName, id } = target;

      // Always start with a root node with a special "START_TARGET_ID"
      this.dependencies.push([START_TARGET_ID, id]);

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
      for (const dep of dependencies) {
        if (dep.includes("#")) {
          // package and task as deps
          this.dependencies.push([dep, id]);
        } else if (dep.startsWith("^") && packageName) {
          // topo dep -> build: ['^build']
          const [depTask, dependencySet] = dep.startsWith("^^")
            ? [dep.substring(2), [...this.getTransitiveGraphDependencies(packageName)]]
            : [dep.substring(1), [...(this.dependencyMap.dependencies.get(packageName) ?? [])]];

          const dependencyIds = targets
            .filter((needle) => {
              const { task, packageName: needlePackageName } = needle;

              return task === depTask && dependencySet.some((depPkg) => depPkg === needlePackageName);
            })
            .map((needle) => needle.id);

          for (const dependencyId of dependencyIds) {
            this.dependencies.push([dependencyId, id]);
          }
        } else if (packageName) {
          // Intra package task dependency - only add the target dependency if it exists in the pipeline targets lists
          if (this.targets.has(getTargetId(packageName, dep))) {
            this.dependencies.push([getTargetId(packageName, dep), target.id]);
          }
        } else if (!dep.startsWith("^")) {
          const dependencyIds = targets.filter((needle) => needle.task === dep).map((needle) => needle.id);

          for (const dependencyId of dependencyIds) {
            this.dependencies.push([dependencyId, id]);
          }
        } else {
          throw new Error(`invalid pipeline config detected: ${target.id}, packageName: ${packageName}, dep: ${dep}`);
        }
      }
    }
  }

  /**
   * Gets a list of package names that are direct or indirect dependencies of rootPackageName in this.graph,
   * and caches them on the Pipeline.
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

      let immediateDependencies = [...(this.dependencyMap.dependencies.get(packageName) ?? [])];

      // build the set of transitive dependencies by recursively walking the
      // immediate dependencies' dependencies.
      let transitiveDepSet = new Set<string>(immediateDependencies);
      for (let immediateDependency of immediateDependencies) {
        for (let transitiveSubDependency of this.getTransitiveGraphDependencies(immediateDependency)) {
          transitiveDepSet.add(transitiveSubDependency);
        }
      }

      // Cache the result and return
      this.cachedTransitiveTaskDependencies.set(packageName, transitiveDepSet);
      return transitiveDepSet;
    }
  }

  private createSubGraph(tasks: string[], scope?: string[]) {
    const targetGraph: [string, string][] = [];
    const queue: string[] = [];

    if (!scope) {
      scope = Object.keys(this.packageInfos);
    }

    for (const task of tasks) {
      // package task
      for (const pkg of scope) {
        if (this.targets.has(getTargetId(pkg, task))) {
          queue.push(getTargetId(pkg, task));
          targetGraph.push([START_TARGET_ID, getTargetId(pkg, task)]);
        }
      }

      // if we have globals, send those into the queue
      for (const target of this.targets.values()) {
        if (target.task === task && !target.packageName) {
          queue.push(target.id);
          targetGraph.push([START_TARGET_ID, target.id]);
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
            targetGraph.push([from, to]);
          }

          if (from) {
            queue.push(from);
          }
        }
      }
    }

    return targetGraph;
  }

  buildTargetGraph(tasks: string[], scope?: string[]) {
    this.expandDependencies();

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
