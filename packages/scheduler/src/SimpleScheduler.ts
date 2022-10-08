import { AbortController } from "abort-controller";
import { categorizeTargetRuns } from "./categorizeTargetRuns";
import { getStartTargetId, sortTargetsByPriority } from "@lage-run/target-graph";
import { WrappedTarget } from "./WrappedTarget";
import { WorkerPool } from "@lage-run/worker-threads-pool";

import type { AbortSignal } from "abort-controller";
import type { CacheProvider, TargetHasher } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import type { TargetGraph, Target } from "@lage-run/target-graph";
import type { TargetScheduler, SchedulerRunResults, SchedulerRunSummary, TargetRunSummary } from "@lage-run/scheduler-types";
import type { Pool } from "@lage-run/worker-threads-pool";
import type { TargetRunnerPickerOptions } from "./runners/TargetRunnerPicker";

export interface SimpleSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  cacheProvider?: CacheProvider;
  hasher?: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  runners: TargetRunnerPickerOptions;
  maxWorkersPerTask: Map<string, number>;
  pool?: Pool; // for testing
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
  targetRuns: Map<string, WrappedTarget> = new Map();
  targetsByPriority: Target[] = [];
  abortController: AbortController = new AbortController();
  abortSignal: AbortSignal = this.abortController.signal;
  dependencies: [string, string][] = [];
  pool: Pool;

  constructor(private options: SimpleSchedulerOptions) {
    this.pool =
      options.pool ??
      new WorkerPool({
        maxWorkers: options.concurrency,
        script: require.resolve("./workers/targetWorker"),
        workerOptions: {
          stdout: true,
          stderr: true,
          workerData: {
            runners: options.runners,
          },
        },
      });
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

    const { continueOnError, logger, cacheProvider, shouldCache, shouldResetCache, hasher } = this.options;
    const { pool, abortController } = this;

    const { dependencies, targets } = targetGraph;
    this.dependencies = dependencies;
    this.targetsByPriority = sortTargetsByPriority([...targets.values()]);
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
        abortController,
        pool,
      });

      if (target.id === getStartTargetId()) {
        targetRun.status = "success";
      }

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

    await this.pool.close();

    return {
      targetRunByStatus,
      targetRuns: this.targetRuns,
      duration,
      startTime,
      results,
      error,
    };
  }

  /**
   * Used by consumers of the scheduler to notify that the inputs to the target has changed
   * @param targetId
   */
  onTargetChange(targetId: string) {
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const targetRun = this.targetRuns.get(current)!;

      if (targetRun.status !== "pending") {
        targetRun.status = "pending";
        const dependents = targetRun.target.dependents;

        console.log(targetRun.target.dependents);

        for (const dependent of dependents) {
          queue.push(dependent);
        }
      }
    }

    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
    for (const targetRun of this.targetRuns.values()) {
      targetRun.abortController = this.abortController;
    }

    this.scheduleReadyTargets();
  }

  getReadyTargets() {
    const { maxWorkersPerTask, concurrency } = this.options;

    const readyTargets: WrappedTarget[] = [];

    const runningTargets = this.targetsByPriority.filter((target) => this.targetRuns.get(target.id)!.status === "running");
    const runningTargetsCountByTask = {};

    for (const target of runningTargets) {
      runningTargetsCountByTask[target.task] =
        typeof runningTargetsCountByTask[target.task] !== "number" ? 1 : runningTargetsCountByTask[target.task]++;
    }

    for (const target of this.targetsByPriority) {
      if (target.id === getStartTargetId()) {
        continue;
      }

      const targetRun = this.targetRuns.get(target.id)!;
      const targetDeps = targetRun.target.dependencies;

      // filter all dependencies for those that are "ready"
      const ready = targetDeps.every((dep) => {
        const fromTarget = this.targetRuns.get(dep)!;
        return fromTarget.status === "success" || fromTarget.status === "skipped" || dep === getStartTargetId();
      });

      const maxWorkers = maxWorkersPerTask.get(target.task) ?? concurrency;

      if (ready && targetRun.status === "pending" && (runningTargetsCountByTask[target.task] ?? 0) < maxWorkers) {
        readyTargets.push(targetRun);
        runningTargetsCountByTask[target.task] = (runningTargetsCountByTask[target.task] ?? 0) + 1;
      }
    }

    return readyTargets;
  }

  isAllDone() {
    for (const t of this.targetRuns.values()) {
      if (t.status !== "skipped" && t.status !== "success" && t.target.id !== getStartTargetId()) {
        return false;
      }
    }

    return true;
  }

  async scheduleReadyTargets() {
    if (this.isAllDone() || this.abortSignal.aborted) {
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

    return await Promise.all(promises);
  }

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
encodeURI;
