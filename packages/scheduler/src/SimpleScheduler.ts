import { getStartTargetId, TargetGraph } from "@lage-run/target-graph";
import { Logger } from "@lage-run/logger";
import { WrappedTarget } from "./WrappedTarget";
import pGraph from "p-graph";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { PGraphNodeMap } from "p-graph";
import type { TargetRunner } from "./types/TargetRunner";
import type { TargetScheduler } from "./types/TargetScheduler";
import type { TargetRunContext } from "./types/TargetRunContext";
import type { AbortSignal } from "abort-controller";
import { AbortController } from "abort-controller";
import { NoOpRunner } from "./runners/NoOpRunner";

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

/**
 * Simple scheduler that runs all targets in a promise graph using p-graph library.
 *
 * Some characteristics:
 * 1. Can cache results of target runs via the cache provider.
 * 2. Takes a TargetRunner, a CacheProvider, a TargetHasher and a Logger as constructor parameters (dependency injection).
 * 3. Directly constructs new WrappedTarget, which provides the call to caching and logging.
 * 4. Can
 *
 * Roadmap / future enhancements:
 * 1. Allow for multiple kinds of runner (currently only ONE is supported, and it is applied to all targets)
 *
 */
export class SimpleScheduler implements TargetScheduler {
  targetRunContexts: Map<string, TargetRunContext>;
  abortController: AbortController;
  abortSignal: AbortSignal;

  constructor(private options: SimpleSchedulerOptions) {
    this.targetRunContexts = new Map();
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
  }

  async run(root: string, targetGraph: TargetGraph) {
    const { concurrency, continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, runner } = this.options;
    const { dependencies, targets } = targetGraph;

    const pGraphNodes: PGraphNodeMap = new Map();
    const pGraphEdges = dependencies;

    for (const target of targets.values()) {
      const wrappedTarget = new WrappedTarget({
        target,
        root,
        logger,
        cacheProvider,
        hasher,
        shouldCache,
        shouldResetCache,
        continueOnError,
        abortSignal: this.abortSignal,
      });

      this.targetRunContexts.set(target.id, wrappedTarget);

      pGraphNodes.set(target.id, {
        /** picks the runner, and run the wrapped target with the runner */
        run: async() => {
          if (this.abortSignal.aborted) {
            return;
          }

          if (target.id === getStartTargetId()) {
            return this.targetRunContexts.get(target.id)!.run(NoOpRunner);
          }

          return this.targetRunContexts.get(target.id)!.run(runner);
        },

        priority: target.priority,
      });
    }

    try {
      await pGraph(pGraphNodes, pGraphEdges).run({
        concurrency,
        continue: continueOnError,
      });

      return this.targetRunContexts;
    } catch (e) {
      logger.error(typeof e === "string" ? e : e instanceof Error && "message" in e ? e.message : "unknown error");
      throw e;
    }
  }

  abort() {
    this.abortController.abort();
  }
}
