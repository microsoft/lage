import { Config } from "../types/Config";
import { generateTopologicGraph } from "../workspace/generateTopologicalGraph";
import { NpmScriptTask } from "./NpmScriptTask";
import { PackageInfos } from "workspace-tools";
import { RunContext } from "../types/RunContext";
import { TargetConfig, TargetConfigFactory, TaskArgs } from "../types/PipelineDefinition";
import { TopologicalGraph } from "../types/TopologicalGraph";
import { Workspace } from "../types/Workspace";
import pGraph, { PGraphNodeMap } from "p-graph";
import path from "path";
import { getPipelinePackages } from "./getPipelinePackages";
import { getPackageAndTask, getTargetId } from "./taskId";
import { WrappedTask } from "./WrappedTask";

/** individual targets to be kept track inside pipeline */
export interface PipelineTarget {
  id: string;
  packageName?: string;
  task: string;
  cwd: string;
  run: (args: TaskArgs) => Promise<unknown> | void;
  deps?: string[];
  outputs?: string[];
  priority?: number;
  cache?: boolean;
  options?: any;
}

const START_TARGET_ID = "__start";

export class Pipeline {
  targets: Map<string, PipelineTarget> = new Map([
    [
      START_TARGET_ID,
      {
        id: START_TARGET_ID,
        cwd: "",
        run: () => {},
        task: START_TARGET_ID,
      },
    ],
  ]);
  dependencies: [string, string][] = [];
  packageInfos: PackageInfos;
  config: Config;
  runContext: RunContext;
  workspace: Workspace;
  graph: TopologicalGraph;

  constructor(workspace: Workspace, config: Config, runContext: RunContext) {
    this.workspace = workspace;
    this.packageInfos = workspace.allPackages;
    this.config = config;
    this.runContext = runContext;
    this.graph = generateTopologicGraph(workspace);
  }

  /**
   * Expands the shorthand notation to pipeline targets (executable units)
   */
  private expandShorthandTargets(id: string, deps: string[]): PipelineTarget[] {
    // shorthand gets converted to npm tasks
    const { packageName, task } = getPackageAndTask(id);
    const results: PipelineTarget[] = [];
    let packagesWithScript: string[] = [];

    if (packageName) {
      packagesWithScript.push(packageName);
    } else {
      packagesWithScript = Object.entries(this.packageInfos)
        .filter(([_pkg, info]) => !!info.scripts?.[task])
        .map(([pkg, _info]) => pkg);
    }

    for (const packageWithScript of packagesWithScript) {
      const info = this.packageInfos[packageWithScript];
      results.push({
        id: getTargetId(packageWithScript, task),
        task,
        cache: true,
        outputs: this.config.cacheOptions.outputGlob,
        packageName: packageWithScript,
        cwd: path.dirname(this.packageInfos[packageWithScript].packageJsonPath),
        run: () => {
          const npmTask = new NpmScriptTask(task, info, this.config);
          return npmTask.run();
        },
        priority: 0, // TODO: restore priority setting here
        options: {},
        deps,
      });
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
   * Converts target configuration to pipeline target
   * @param id
   * @param target
   */
  private convertToPipelineTarget(id: string, index: number, target: TargetConfig): PipelineTarget[] {
    if (target.type === "global") {
      return [
        {
          ...target,
          id: `${id}.${index}`,
          cwd: this.workspace.root,
          task: id,
          run: target.run || (() => {}),
        },
      ];
    } else {
      const packages = Object.keys(this.packageInfos);
      return packages.map((pkg) => ({
        id: getTargetId(pkg, id),
        ...target,
        task: id,
        cwd: path.dirname(this.packageInfos[pkg].packageJsonPath),
        packageName: pkg,
        run: target.run || (() => {}),
      }));
    }
  }

  /**
   * Adds a target definition (takes in shorthand, target config, or a target config factory)
   * @param id
   * @param targetDefinition
   */
  addTargetDefinition(id: string, targetDefinition: string[] | TargetConfig | TargetConfigFactory) {
    if (Array.isArray(targetDefinition)) {
      const targets = this.expandShorthandTargets(id, targetDefinition);

      for (const target of targets) {
        this.targets.set(target.id!, target);
      }
    } else {
      const targets =
        typeof targetDefinition === "function" ? this.generateFactoryTargets(targetDefinition) : [targetDefinition];

      targets.forEach((target, index) => {
        const pipelineTargets = this.convertToPipelineTarget(id, index, target);

        for (const pipelineTarget of pipelineTargets) {
          this.targets.set(pipelineTarget.id, pipelineTarget);
        }
      });
    }
  }

  addDependencies() {
    const targets = [...this.targets.values()];

    for (const target of targets) {
      const { deps, packageName, id } = target;

      if (!deps || deps.length === 0) {
        this.dependencies.push([START_TARGET_ID, id]);
        continue;
      }

      for (const dep of deps) {
        if (dep.includes("#")) {
          // package and task as deps
          this.dependencies.push([dep, id]);
        } else if (dep.startsWith("^") && packageName) {
          // topo dep -> build: ['^build']
          const depTask = dep.substr(1);

          const dependencyIds = targets
            .filter((needle) => {
              const { task, packageName: needlePackageName } = needle;

              return (
                task === depTask && this.graph[packageName].dependencies.some((depPkg) => depPkg === needlePackageName)
              );
            })
            .map((needle) => needle.id);

          for (const dependencyId of dependencyIds) {
            this.dependencies.push([dependencyId, id]);
          }
        } else if (packageName) {
          if (this.targets.has(getTargetId(packageName, dep))) {
            this.dependencies.push([getTargetId(packageName, dep), target.id]);
          }
        } else if (!dep.startsWith("^")) {
          const dependencyIds = targets
            .filter((needle) => {
              const { task } = needle;
              return task === dep;
            })
            .map((needle) => needle.id);

          for (const dependencyId of dependencyIds) {
            this.dependencies.push([dependencyId, id]);
          }
        } else {
          throw new Error(`invalid pipeline config detected: ${target.id}`);
        }
      }
    }
  }

  private generateTargetGraph() {
    const scope = getPipelinePackages(this.workspace, this.config);
    const tasks = this.config.command;

    const targetGraph: [string, string][] = [];

    const queue: string[] = [];

    for (const task of tasks) {
      // package task
      for (const pkg of scope) {
        if (this.targets.has(getTargetId(pkg, task))) {
          queue.push(getTargetId(pkg, task));
        }
      }

      // if we have globals, send those into the queue
      for (const target of this.targets.values()) {
        if (target.task === task && !target.packageName) {
          queue.push(task);
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
          }

          if (from) {
            queue.push(from);
          }
        }
      }
    }

    return targetGraph;
  }

  async run() {
    const nodeMap: PGraphNodeMap = new Map();
    const targetGraph = this.generateTargetGraph();

    for (const [from, to] of targetGraph) {
      const fromTarget = this.targets.get(from)!;
      const toTarget = this.targets.get(to)!;

      for (const target of [fromTarget, toTarget]) {
        nodeMap.set(target.id, {
          run: () => {
            if (target.id === START_TARGET_ID) {
              return Promise.resolve();
            }

            const wrappedTask = new WrappedTask(target, this.workspace.root, this.config, this.runContext);
            return wrappedTask.run();
          },
          priority: target.priority,
        });
      }
    }

    await pGraph(nodeMap, targetGraph).run({
      concurrency: this.config.concurrency,
      continue: this.config.continue,
    });
  }
}
