import { AbortController } from "abort-controller";
import { categorizeTargetRuns } from "./categorizeTargetRuns";
import { WrappedTarget } from "./WrappedTarget";

import type { AbortSignal } from "abort-controller";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import type { PGraphNodeMap } from "p-graph";
import type { SchedulerRunResults, SchedulerRunSummary, TargetRunSummary } from "./types/SchedulerRunSummary";
import type { TargetGraph } from "@lage-run/target-graph";
import type { TargetRunnerPicker } from "./runners/TargetRunnerPicker";
import type { TargetScheduler } from "./types/TargetScheduler";
import type { WorkerPool } from "@lage-run/worker-threads-pool";

export interface WatchSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  runnerPicker: { pick: TargetRunnerPicker["pick"] };
  pool: WorkerPool;
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
export class WatchScheduler implements TargetScheduler {
  wrappedTargets: Map<string, WrappedTarget>;
  abortController: AbortController;
  abortSignal: AbortSignal;

  constructor(private options: WatchSchedulerOptions) {
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

    const { continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, runnerPicker } = this.options;

    const { dependencies, targets } = targetGraph;

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
    }

    return {} as any;
  }

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
