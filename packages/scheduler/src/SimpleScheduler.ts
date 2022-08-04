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

  // TODO: allow for multiple kinds of runner
  runner: TargetRunner;
}

export class SimpleScheduler {
  targets: Map<string, WrappedTarget>;

  constructor(private options: SimpleSchedulerOptions) {
    this.targets = new Map();
  }

  async run(root: string, targetGraph: TargetGraph) {
    const { concurrency, continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, runner } = this.options;
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

            const wrappedTarget = new WrappedTarget({
              target,
              root,
              logger,
              cacheProvider,
              hasher,
              shouldCache,
              shouldResetCache,
              continueOnError,
            });

            this.targets.set(target.id, wrappedTarget);

            // TODO: pick a runner
            return wrappedTarget.run(runner);
          },
          priority: target.priority,
        });
      }
    }

    try {
      await pGraph(pGraphNodes, pGraphEdges).run({
        concurrency,
        continue: continueOnError,
      });
      return this.targets;
    } catch (e) {
      logger.error(typeof e === "string" ? e : e instanceof Error && "message" in e ? e.message : "unknown error");
      process.exitCode = 1;
      return this.targets;
    }
  }

  abort() {
    this.options.runner.abort();
  }
}
