import { Config } from "../types/Config";
import { generateTopologicGraph } from "../workspace/generateTopologicalGraph";
import { NpmScriptTask } from "./NpmScriptTask";
import { PackageInfo, PackageInfos } from "workspace-tools";
import { RunContext } from "../types/RunContext";
import { PipelineTarget, TargetConfig, TargetConfigFactory, TaskArgs } from "../types/PipelineDefinition";
import { TopologicalGraph } from "../types/TopologicalGraph";
import { Workspace } from "../types/Workspace";
import pGraph, { PGraphNodeMap } from "p-graph";
import path from "path";
import { getPipelinePackages } from "./getPipelinePackages";
import { getPackageAndTask, getTargetId } from "./taskId";
import { WrappedTarget } from "./WrappedTarget";

export const START_TARGET_ID = "__start";

/**
 * Pipeline class represents lage's understanding of the dependency graphs and wraps the promise graph implementations to execute tasks in order
 */
export class Pipeline {
  private cachedTransitiveTaskDependencies: Map<string, "walk-in-progress" | Set<string>> = new Map();

  /** Target represent a unit of work and the configuration of how to run it */
  targets: Map<string, PipelineTarget> = new Map([
    [
      START_TARGET_ID,
      {
        id: START_TARGET_ID,
        cwd: "",
        run: () => {},
        task: START_TARGET_ID,
        hidden: true,
        cache: false,
      },
    ],
  ]);

  /** Target dependencies determine the run order of the targets  */
  dependencies: [string, string][] = [];

  /** Internal cache of the package.json information */
  packageInfos: PackageInfos;

  /** Internal generated cache of the topological package graph */
  graph: TopologicalGraph;

  /** Internal cache of context */
  context: RunContext | undefined;

  constructor(private workspace: Workspace, private config: Config) {
    this.packageInfos = workspace.allPackages;
    this.graph = generateTopologicGraph(workspace);
    this.loadConfig(config);
  }

  /**
   * NPM Tasks are blindly placed in the task dependency graph, but we skip doing work if the package does not contain the specific npm task
   * @param task
   * @param info
   * @returns
   */
  private maybeRunNpmTask(task: string, info: PackageInfo) {
    if (!info.scripts?.[task]) {
      return;
    }

    return (args: TaskArgs) => {
      const npmTask = new NpmScriptTask(task, info, this.config, args.logger);
      return npmTask.run();
    };
  }

  /**
   * Generates a package target during the expansion of the shortcut syntax
   */
  private generatePackageTarget(packageName: string, task: string, deps: string[]): PipelineTarget {
    const info = this.packageInfos[packageName];
    const id = getTargetId(packageName, task);

    return {
      id,
      task,
      cache: this.config.cache,
      outputGlob: this.config.cacheOptions.outputGlob,
      packageName: packageName,
      cwd: path.dirname(this.packageInfos[packageName].packageJsonPath),
      run: this.maybeRunNpmTask(task, info),
      // TODO: do we need to really merge this? Is this desired? (this is the OLD behavior)
      deps: this.targets.has(id) ? [...(this.targets.get(id)!.deps || []), ...deps] : deps,
    };
  }

  /**
   * Expands the shorthand notation to pipeline targets (executable units)
   */
  private expandShorthandTargets(id: string, deps: string[]): PipelineTarget[] {
    // shorthand gets converted to npm tasks
    const { packageName, task } = getPackageAndTask(id);
    const results: PipelineTarget[] = [];
    let packages: string[] = [];

    if (packageName) {
      // specific case in definition (e.g. 'package-name#test': ['build'])
      packages.push(packageName);
    } else {
      // generic case in definition (e.g. 'test': ['build'])
      packages = Object.entries(this.packageInfos).map(([pkg, _info]) => pkg);
    }

    for (const packageWithScript of packages) {
      results.push(this.generatePackageTarget(packageWithScript, task, deps));
    }

    return results;
  }

  /**
   * Given an id & factory, generate targets configurations
   * @param id
   * @param factory
   */
  private generateFactoryTargets(factory: TargetConfigFactory): TargetConfig[] {
    const targets = factory({
      config: this.config,
      cwd: this.workspace.root,
    });

    return Array.isArray(targets) ? targets : [targets];
  }

  /**
   * Converts target configuration to pipeline targets
   * @param id
   * @param target
   */
  private convertToPipelineTarget(id: string, index: number, target: TargetConfig): PipelineTarget[] {
    if (target.type === "global") {
      const targetId = `${id}.${index}`;
      return [
        {
          ...target,
          id: targetId,
          cache: target.cache !== false,
          cwd: this.workspace.root,
          task: id,
          run: () => {},
        },
      ];
    } else if (id.includes("#")) {
      const { packageName: pkg, task } = getPackageAndTask(id);
      return [
        {
          ...target,

          id,
          cache: target.cache !== false,
          task: id,
          cwd: path.dirname(this.packageInfos[pkg!].packageJsonPath),
          packageName: pkg,
          run: this.maybeRunNpmTask(task, this.packageInfos[pkg!]),
        },
      ];
    } else {
      const packages = Object.entries(this.packageInfos);
      return packages.map(([pkg, _info]) => {
        const targetId = getTargetId(pkg, id);
        return {
          ...target,

          id: targetId,
          cache: target.cache !== false,
          task: id,
          cwd: path.dirname(this.packageInfos[pkg].packageJsonPath),
          packageName: pkg,
          run: this.maybeRunNpmTask(id, this.packageInfos[pkg]),
        };
      });
    }
  }

  /**
   * Adds a target definition (takes in shorthand, target config, or a target config factory)
   * @param id
   * @param targetDefinition
   */
  addTargetDefinition(id: string, targetDefinition: string[] | TargetConfig | TargetConfigFactory) {
    // e.g. build: ["^build", "prepare"]
    if (Array.isArray(targetDefinition)) {
      const targets = this.expandShorthandTargets(id, targetDefinition);

      for (const target of targets) {
        this.targets.set(target.id!, target);
      }
    } else {
      // e.g. build: { /* target config */ }
      const targets = typeof targetDefinition === "function" ? this.generateFactoryTargets(targetDefinition) : [targetDefinition];

      targets.forEach((target, index) => {
        const pipelineTargets = this.convertToPipelineTarget(id, index, target);

        for (const pipelineTarget of pipelineTargets) {
          this.targets.set(pipelineTarget.id, pipelineTarget);
        }
      });
    }
  }

  /**
   * Adds all the target dependencies to the graph
   */
  addDependencies() {
    const targets = [...this.targets.values()];

    for (const target of targets) {
      const { deps, packageName, id } = target;

      // Always start with a root node with a special "START_TARGET_ID"
      this.dependencies.push([START_TARGET_ID, id]);

      // Skip any targets that have no "deps" specified
      if (!deps || deps.length === 0) {
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
      for (const dep of deps) {
        if (dep.includes("#")) {
          // package and task as deps
          this.dependencies.push([dep, id]);
        } else if (dep.startsWith("^") && packageName) {
          // topo dep -> build: ['^build']
          const [depTask, dependencySet] = dep.startsWith("^^")
            ? [dep.substr(2), [...this.getTransitiveGraphDependencies(packageName)]]
            : [dep.substr(1), this.graph[packageName].dependencies];

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
          throw new Error(`invalid pipeline config detected: ${target.id}`);
        }
      }
    }
  }

  /**
   * Gets a list of package names that are direct or indirect dependencies of rootPackageName in this.graph,
   * and caches them on the Pipeline.
   * @param packageName the root package to begin walking from
   */
  getTransitiveGraphDependencies(packageName: string): Set<string> {
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

      let immediateDependencies = this.graph[packageName]?.dependencies ?? [];

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

  generateTargetGraph() {
    const scope = getPipelinePackages(this.workspace, this.config);
    const tasks = this.config.command;

    const targetGraph: [string, string][] = [];

    const queue: string[] = [];

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

      const { packageName, task } = getPackageAndTask(id);

      if (!packageName) {
        // global - find all deps in the form of "task.index"
        for (const [from, to] of this.dependencies) {
          if (to.includes(".")) {
            const toTaskName = to.split(".")[0];
            if (toTaskName === task) {
              targetGraph.push([from, to]);

              if (from) {
                queue.push(from);
              }
            }
          }
        }
      } else {
        // package dep
        for (const [from, to] of this.dependencies) {
          if (to === id) {
            targetGraph.push([from, to]);

            if (from) {
              queue.push(from);
            }
          }
        }
      }
    }

    return targetGraph;
  }

  loadConfig(config: Config) {
    this.config = config;

    for (const [id, targetDefinition] of Object.entries(this.config.pipeline)) {
      this.addTargetDefinition(id, targetDefinition);
    }

    // add target definitions for unknown tasks
    const knownTasks = new Set<string>();
    for (const target of this.targets.values()) {
      knownTasks.add(target.task);
    }

    knownTasks.add(START_TARGET_ID);

    const unknownCommands = this.config.command.filter((cmd) => !knownTasks.has(cmd));

    for (const command of unknownCommands) {
      this.addTargetDefinition(command, [`^${command}`]);
    }

    this.addDependencies();
  }

  private getTargetPriority(target: PipelineTarget) {
    return target.priority !== undefined
      ? target.priority
      : this.config.priorities?.find((priority) => priority.package === target.packageName && priority.task === target.task)?.priority;
  }

  /**
   * The "run" public API, accounts for setting distributed mode for the master lage node
   *
   * Runs the pipeline with the p-graph library
   *
   * Note: this is the abstraction layer on top of the external p-graph library to insulate
   *       any incoming changes to the library.
   */
  async run(context: RunContext) {
    this.context = context;

    const nodeMap: PGraphNodeMap = new Map();
    const targetGraph = this.generateTargetGraph();

    for (const [from, to] of targetGraph) {
      const fromTarget = this.targets.get(from)!;
      const toTarget = this.targets.get(to)!;

      for (const target of [fromTarget, toTarget]) {
        nodeMap.set(target.id, {
          run: () => {
            if (target.id === START_TARGET_ID || !target.run) {
              return Promise.resolve();
            }

            const wrappedTask = new WrappedTarget(target, this.workspace.root, this.config, context);
            return wrappedTask.run();
          },
          priority: this.getTargetPriority(target),
        });
      }
    }

    await pGraph(nodeMap, targetGraph).run({
      concurrency: this.config.concurrency,
      continue: this.config.continue,
    });
  }
}
