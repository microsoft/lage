import { getStartTargetId } from "./targetId.js";
import { prioritize } from "./prioritize.js";
import { detectCycles } from "./detectCycles.js";

import type { Target } from "./types/Target.js";

/**
 * Target graph builder
 *
 * This class purely deals with the graph structure of targets. Here are the scope of the responsibilities:
 * 1. add new target
 * 2. add new dependency
 * 3. detect cycles
 * 4. prioritize targets
 * 5. build sub-graph
 * 6. build target graph
 *
 * This class does not deal with:
 * 1. converting target definition into targets
 * 2. expanding dependency specs
 * 3. resolving package paths, etc.
 *
 * Example usage:
 *
 * const targetFactory = new TargetFactor({...});
 *
 * const target1 = targetFactory.createPackageTarget("foo", "build", { ... });
 * const target2 = targetFactory.createPackageTarget("bar", "build", { ... });
 *
 * const builder = new TargetGraphBuilder();
 * builder.addTarget(target1);
 * builder.addTarget(target2);
 * builder.addDependency(target1, target2);
 *
 * // builds a target graph (full graph)
 * const targetGraph = builder.build();
 *
 * // builds a sub-graph (partial graph starting with target1)
 * const subGraph = builder.subgraph([target1.id]);
 *
 */
export class TargetGraphBuilder {
  /** A map of targets - used internally for looking up generated targets from the target configurations */
  targets: Map<string, Target> = new Map();

  /**
   * Initializes the builder with package infos
   */
  constructor() {
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
      priority: 0,
    } as Target);
  }

  addTarget(target: Target) {
    this.targets.set(target.id, target);
    this.addDependency(getStartTargetId(), target.id);
    return target;
  }

  addDependency(dependency: string, dependent: string) {
    if (this.targets.has(dependent)) {
      const target = this.targets.get(dependent)!;

      if (!target.dependencies.includes(dependency)) {
        target.dependencies.push(dependency);
      }
    }

    if (this.targets.has(dependency)) {
      const target = this.targets.get(dependency)!;

      if (!target.dependents.includes(dependent)) {
        target.dependents.push(dependent);
      }
    }
  }

  /**
   * Builds a target graph for given tasks and packages
   */
  build() {
    // Ensure we do not have cycles in the subgraph
    const cycleInfo = detectCycles(this.targets);
    if (cycleInfo.hasCycle) {
      throw new Error("Cycles detected in the target graph: " + cycleInfo.cycle!.concat(cycleInfo.cycle![0]).join(" -> "));
    }

    // The full graph might produce a different aggregated priority value for a target
    prioritize(this.targets);

    return {
      targets: this.targets,
    };
  }

  subgraph(entriesTargetIds: string[]) {
    const subgraphBuilder = new TargetGraphBuilder();
    const visited: string[] = [];
    const queue: string[] = [];

    for (const targetId of entriesTargetIds) {
      if (this.targets.has(targetId)) {
        const target = this.targets.get(targetId)!;
        subgraphBuilder.addTarget({ ...target, dependencies: [], dependents: [] });
        queue.push(targetId);
      }
    }

    while (queue.length > 0) {
      const targetId = queue.shift()!;
      if (visited.includes(targetId)) {
        continue;
      }

      visited.push(targetId);

      const target = this.targets.get(targetId);

      if (!target) {
        throw new Error("Subgraph builder failed - target not found: " + targetId);
      }

      for (const dependency of target.dependencies) {
        if (dependency !== getStartTargetId()) {
          if (!subgraphBuilder.targets.has(dependency)) {
            subgraphBuilder.addTarget({ ...this.targets.get(dependency)!, dependencies: [], dependents: [] });
          }

          subgraphBuilder.addDependency(dependency, targetId);
        }

        queue.push(dependency);
      }
    }

    return subgraphBuilder.build();
  }
}
