import { getStartTargetId, TargetGraph } from "@lage-run/target-graph";
import { Logger } from "@lage-run/logger";
import { WrappedTarget } from "./WrappedTarget";
import pGraph from "p-graph";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { PGraphNodeMap } from "p-graph";
import { TargetRunner } from "./types/TargetRunner";

export interface SimpleSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  runners: Map<string, TargetRunner>;
}

export class SimpleScheduler {
  constructor(private options: SimpleSchedulerOptions) {}

  async run(root: string, targetGraph: TargetGraph) {
    const { concurrency, continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher } = this.options;
    const { dependencies, targets } = targetGraph;
    const pGraphNodes: PGraphNodeMap = new Map();
    const pGraphEdges = dependencies;

    for (const [from, to] of dependencies) {
      const fromTarget = targets.get(from)!;
      const toTarget = targets.get(to)!;

      for (const target of [fromTarget, toTarget]) {
        pGraphNodes.set(target.id, {
          run: () => {
            if (target.id === getStartTargetId() || !target.run) {
              return Promise.resolve();
            }

            const wrappedTask = new WrappedTarget({
              target,
              root,
              logger,
              cacheProvider,
              hasher,
              shouldCache,
              shouldResetCache,
              continueOnError,
            });

            // TODO: pick a runner
            return wrappedTask.run();
          },
          priority: target.priority,
        });
      }
    }

    await pGraph(pGraphNodes, pGraphEdges).run({
      concurrency,
      continue: continueOnError,
    });
  }
}
