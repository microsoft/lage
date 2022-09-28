import { AbortController } from "abort-controller";
import { categorizeTargetRuns } from "./categorizeTargetRuns";
import { WrappedTarget } from "./WrappedTarget";

import type { AbortSignal } from "abort-controller";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import type { SchedulerRunResults, SchedulerRunSummary, TargetRunSummary } from "./types/SchedulerRunSummary";
import { getStartTargetId, TargetGraph } from "@lage-run/target-graph";
import type { TargetScheduler } from "./types/TargetScheduler";
import type { WorkerPool } from "@lage-run/worker-threads-pool";

export interface SimpleSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  pool: WorkerPool;
}

/**
 * TODO FEATURES:
 * - priorities
 * - abort signals
 * - api target change
 * - api target add / remove
 * - summarize
 * - figure out the logger by line issue with docusaurus
 */

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
  targetRuns: Map<string, WrappedTarget>;
  targetIdsByPriority: string[] = [];
  abortController: AbortController;
  abortSignal: AbortSignal;
  dependencies: [string, string][] = [];

  constructor(private options: SimpleSchedulerOptions) {
    this.targetRuns = new Map();
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

    const { continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, pool } = this.options;

    const { dependencies, targets, targetIdsByPriority } = targetGraph;
    this.dependencies = dependencies;
    this.targetIdsByPriority = targetIdsByPriority;

    for (const target of targets.values()) {
      const targetRun = new WrappedTarget({
        target,
        root,
        logger,
        cacheProvider,
        hasher,
        shouldCache,
        shouldResetCache,
        continueOnError,
        abortController: this.abortController,
        pool,
      });

      this.targetRuns.set(target.id, targetRun);
    }

    let results: SchedulerRunResults = "failed";
    let error: string | undefined;
    let duration: [number, number] = [0, 0];
    let targetRunByStatus: TargetRunSummary;

    try {
      await this.scheduleReadyTargets();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      duration = process.hrtime(startTime);
      targetRunByStatus = categorizeTargetRuns([...this.targetRuns.values()]);

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

    try {
      await this.scheduleReadyTargets();
    } finally {
      this.options.pool.close();
    }

    return {
      targetRunByStatus,
      targetRuns: this.targetRuns,
      duration,
      startTime,
      results,
      error,
    };
  }

  // /**
  //  * The job of the run method is to:
  //  * 1. Convert the target graph into a promise graph.
  //  * 2. Create a promise graph of all targets
  //  * 3. Pass the continueOnError option to the promise graph runner.
  //  *
  //  * @param root
  //  * @param targetGraph
  //  * @returns
  //  */
  // async start(root: string, targetGraph: TargetGraph): Promise<SchedulerRunSummary> {
  //   const startTime: [number, number] = process.hrtime();

  //   const { continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher, pool } = this.options;

  //   const { dependencies, targets } = targetGraph;
  //   this.dependencies = dependencies;

  //   for (const target of targets.values()) {
  //     const wrappedTarget = new WrappedTarget({
  //       target,
  //       root,
  //       logger,
  //       cacheProvider,
  //       hasher,
  //       shouldCache,
  //       shouldResetCache,
  //       continueOnError,
  //       abortController: this.abortController,
  //       pool,
  //     });

  //     this.wrappedTargets.set(target.id, wrappedTarget);
  //   }

  //   this.scheduleReadyTargets();

  //   return {} as any;
  // }

  // onTargetChange(targetId: string) {
  //   const queue = [targetId];
  //   while (queue.length > 0) {
  //     const current = queue.shift()!;

  //     const target = this.wrappedTargets.get(current)!;

  //     if (target.status !== "pending") {
  //       target.status = "pending";
  //       const dependents = this.dependencies.filter(([from]) => {
  //         return from === current;
  //       });

  //       for (const [_, to] of dependents) {
  //         queue.push(to);
  //       }
  //     }
  //   }
  //   this.scheduleReadyTargets();
  // }

  *getReadyTargets() {
    // TODO: implement priorities
    for (const id of this.targetIdsByPriority) {
      if (id === getStartTargetId()) {
        continue;
      }

      const targetRun = this.targetRuns.get(id)!;
      const targetDeps = targetRun.target.dependencies;

      // TODO: implement maxWorker for a certain task type
      // filter all dependencies for those that are "ready"
      const ready = targetDeps.every((dep) => {
        const fromTarget = this.targetRuns.get(dep)!;
        return fromTarget.status === "success" || fromTarget.status === "skipped" || dep === getStartTargetId();
      });

      if (ready && targetRun.status === "pending") {
        yield targetRun;
      }
    }
  }

  isAllDone() {
    for (const t of this.targetRuns.values()) {
      if (t.status !== "skipped" && t.status !== "success" && t.target.id !== getStartTargetId()) {
        return false;
      }
    }

    return true;
  }

  scheduleReadyTargets() {
    if (this.isAllDone()) {
      return;
    }

    const promises: Promise<any>[] = [];

    for (const nextTarget of this.getReadyTargets()) {
      promises.push(
        nextTarget
          .run()
          .then(() => {
            return this.scheduleReadyTargets();
          })
          .catch((e) => {
            // if a continue option is set, this merely records what errors have been encountered
            // it'll continue down the execution until all the tasks that still works
            if (this.options?.continueOnError) {
              return this.scheduleReadyTargets();
            } else {
              // immediately reject, if not using "continue" option
              throw e;
            }
          })
      );
    }

    return Promise.all(promises);
  }

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
encodeURI;
