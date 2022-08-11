import { getStartTargetId, TargetGraph } from "@lage-run/target-graph";
import { Logger } from "@lage-run/logger";
import { WrappedTarget } from "./WrappedTarget";
import pGraph from "p-graph";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { PGraphNodeMap } from "p-graph";
import type { TargetRunner } from "./types/TargetRunner";
import type { TargetScheduler } from "./types/TargetScheduler";
import type { AbortSignal } from "abort-controller";
import { AbortController } from "abort-controller";
import { NoOpRunner } from "./runners/NoOpRunner";
import { SchedulerRunResults, SchedulerRunSummary } from "./types/SchedulerRunSummary";
import { categorizeTargetRuns } from "./categorizeTargetRuns";

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
 *
 * Roadmap / future enhancements:
 * 1. Allow for multiple kinds of runner (currently only ONE is supported, and it is applied to all targets)
 *
 */
export class SimpleScheduler implements TargetScheduler {
  wrappedTargets: Map<string, WrappedTarget>;
  abortController: AbortController;
  abortSignal: AbortSignal;

  constructor(private options: SimpleSchedulerOptions) {
    this.wrappedTargets = new Map();
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
  }

  /**
   * The job of the run method is to:
   * 1. Convert the target graph into a promise graph.
   * 2. Create a promise graph of all targets
   * 3. Pass the continueOnError option to the promise graph runner.
   *
   * @param root
   * @param targetGraph
   * @returns
   */
  async run(root: string, targetGraph: TargetGraph): Promise<SchedulerRunSummary> {
    const startTime: [number, number] = process.hrtime();

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
        abortController: this.abortController,
      });

      this.wrappedTargets.set(target.id, wrappedTarget);

      pGraphNodes.set(target.id, {
        /**
         * Picks the runner, and run the wrapped target with the runner
         */
        run: async () => {
          if (this.abortSignal.aborted) {
            return;
          }

          if (target.id === getStartTargetId()) {
            return this.wrappedTargets.get(target.id)!.run(NoOpRunner);
          }

          return this.wrappedTargets.get(target.id)!.run(runner);
        },

        priority: target.priority,
      });
    }

    let results: SchedulerRunResults = "success";
    let error: string | undefined;

    try {
      await pGraph(pGraphNodes, pGraphEdges).run({
        concurrency,
        continue: continueOnError,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      const duration = process.hrtime(startTime);
      const targetRunByStatus = categorizeTargetRuns([...this.wrappedTargets.values()]);
      if (targetRunByStatus.aborted.length > 0) {
        results = "aborted";
      }

      return {
        targetRunByStatus,
        targetRuns: this.wrappedTargets,
        duration,
        startTime,
        results,
        error,
      };
    }
  }

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
