import { AbortController } from "abort-controller";
import { categorizeTargetRuns } from "./categorizeTargetRuns";
import { WrappedTarget } from "./WrappedTarget";
import pGraph from "p-graph";
import type { AbortSignal } from "abort-controller";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import type { PGraphNodeMap } from "p-graph";
import type { SchedulerRunResults, SchedulerRunSummary, TargetRunSummary, TargetScheduler } from "@lage-run/scheduler-types";
import type { TargetGraph } from "@lage-run/target-graph";
import type { TargetRunnerPicker } from "./runners/TargetRunnerPicker";

export interface SimpleSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  runnerPicker: { pick: TargetRunnerPicker["pick"] };
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

    const { concurrency, continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, runnerPicker } = this.options;
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

          const runner = runnerPicker.pick(target);
          return this.wrappedTargets.get(target.id)!.run(runner);
        },

        priority: target.priority,
      });
    }

    let results: SchedulerRunResults = "failed";
    let error: string | undefined;
    let duration: [number, number] = [0, 0];
    let targetRunByStatus: TargetRunSummary;

    try {
      await pGraph(pGraphNodes, pGraphEdges).run({
        concurrency,
        continue: continueOnError,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      duration = process.hrtime(startTime);
      targetRunByStatus = categorizeTargetRuns([...this.wrappedTargets.values()]);

      if (
        targetRunByStatus.failed.length +
          targetRunByStatus.aborted.length +
          targetRunByStatus.pending.length +
          targetRunByStatus.running.length ===
        0
      ) {
        results = "success";
      }
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

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
