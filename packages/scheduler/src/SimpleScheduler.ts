import { getStartTargetId, TargetGraph } from "@lage-run/target-graph";
import { Logger } from "@lage-run/logger";
import { WrappedTarget } from "./WrappedTarget";
import pGraph from "p-graph";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { PGraphNodeMap } from "p-graph";
import type { TargetRunner } from "./types/TargetRunner";
import type { TargetScheduler } from "./types/TargetScheduler";
import type { TargetRunInfo } from "./types/TargetRunInfo";

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

export class SimpleScheduler implements TargetScheduler {
  targetRunInfo: Map<string, TargetRunInfo>;

  constructor(private options: SimpleSchedulerOptions) {
    this.targetRunInfo = new Map();
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

            this.targetRunInfo.set(target.id, wrappedTarget);

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
      return this.targetRunInfo;
    } catch (e) {
      logger.error(typeof e === "string" ? e : e instanceof Error && "message" in e ? e.message : "unknown error");
      process.exitCode = 1;
      return this.targetRunInfo;
    }
  }

  abort() {
    this.options.runner.abort();
  }
}
