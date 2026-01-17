import { AggregatedPool } from "@lage-run/worker-threads-pool";
import { formatBytes } from "./formatBytes.js";
import { categorizeTargetRuns } from "./categorizeTargetRuns.js";
import { getStartTargetId, sortTargetsByPriority } from "@lage-run/target-graph";
import { WrappedTarget } from "./WrappedTarget.js";
import { TargetRunnerPicker } from "@lage-run/runners";

import type { WorkerResult } from "./WrappedTarget.js";
import type { Logger } from "@lage-run/logger";
import type { TargetGraph } from "@lage-run/target-graph";
import type { TargetScheduler, SchedulerRunResults, SchedulerRunSummary, TargetRunSummary } from "@lage-run/scheduler-types";
import type { Pool } from "@lage-run/worker-threads-pool";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import type { TargetHasher } from "@lage-run/hasher";
import type { CacheOptions } from "@lage-run/cache";
import type { MessagePort } from "worker_threads";

export interface SimpleSchedulerOptions {
  logger: Logger;
  concurrency: number;
  continueOnError: boolean;
  shouldCache: boolean;
  shouldResetCache: boolean;
  workerData: {
    runners: TargetRunnerPickerOptions;
    root: string;
    taskArgs: string[];
    skipLocalCache?: boolean;
    cacheOptions?: CacheOptions;
  };
  maxWorkersPerTask: Map<string, number>;
  pool?: Pool; // for testing
  workerIdleMemoryLimit: number; // in bytes
  hasher: TargetHasher;
  onMessage?: (message: any, postMessage: MessagePort["postMessage"]) => void;
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
export class SimpleScheduler implements TargetScheduler<WorkerResult> {
  targetRuns: Map<string, WrappedTarget> = new Map();
  rerunTargets: Set<string> = new Set();
  abortController: AbortController = new AbortController();
  abortSignal: AbortSignal = this.abortController.signal;
  pool: Pool;
  runnerPicker: TargetRunnerPicker;

  runPromise = Promise.resolve() as Promise<any>;

  constructor(private options: SimpleSchedulerOptions) {
    this.pool =
      options.pool ??
      new AggregatedPool({
        logger: options.logger,
        maxWorkersByGroup: options.maxWorkersPerTask,
        groupBy: ({ target }) => target.task,
        maxWorkers: options.concurrency,
        script: require.resolve("./workers/targetWorker"),
        workerOptions: {
          stdout: true,
          stderr: true,
          workerData: { ...options.workerData, shouldCache: options.shouldCache, shouldResetCache: options.shouldResetCache },
        },
        workerIdleMemoryLimit: options.workerIdleMemoryLimit, // in bytes
      });

    this.runnerPicker = new TargetRunnerPicker(options.workerData.runners);
  }

  getTargetsByPriority() {
    return sortTargetsByPriority([...this.targetRuns.values()].map((run) => run.target));
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
  async run(root: string, targetGraph: TargetGraph, shouldRerun = false): Promise<SchedulerRunSummary<WorkerResult>> {
    const startTime: [number, number] = process.hrtime();

    const { continueOnError, logger, shouldCache } = this.options;

    logger.verbose("", {
      schedulerRun: {
        startTime,
      },
    });

    const { pool, abortController } = this;

    const { targets } = targetGraph;

    for (const target of targets.values()) {
      let targetRun: WrappedTarget;

      const prevTargetRun = this.targetRuns.get(target.id);
      if (prevTargetRun) {
        targetRun = prevTargetRun;

        // If previous run has been successful, then we may want to rerun
        if (prevTargetRun.successful && shouldRerun) {
          this.markTargetAndDependentsPending(target.id);
        } else if (prevTargetRun.waiting && shouldRerun) {
          this.rerunTargets.add(targetRun.target.id);
        } else if (!prevTargetRun.successful) {
          // If previous run has failed, we should rerun
          this.markTargetAndDependentsPending(target.id);
        }
      } else {
        targetRun = new WrappedTarget({
          target,
          root,
          logger,
          shouldCache,
          continueOnError,
          abortController,
          pool,
          hasher: this.options.hasher,
          onMessage: this.options.onMessage,
        });
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
      targetRunByStatus = categorizeTargetRuns(this.targetRuns.values());

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

    const poolStats = pool.stats();

    await this.options.hasher.cleanup();

    return {
      targetRunByStatus,
      targetRuns: this.targetRuns,
      duration,
      startTime,
      results,
      error,
      workerRestarts: poolStats.workerRestarts, // number of times a worker was restarted due to memory usage
      maxWorkerMemoryUsage: poolStats.maxWorkerMemoryUsage, // max memory usage of a worker in bytes
    };
  }

  /**
   * Used by consumers of the scheduler to notify that the inputs to the target has changed
   * @param targetId
   */
  markTargetAndDependentsPending(targetId: string) {
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;

      if (this.targetRuns.has(current)) {
        const targetRun = this.targetRuns.get(current)!;

        if (targetRun.status !== "pending") {
          targetRun.reset();
          this.rerunTargets.add(targetRun.target.id);
          const dependents = targetRun.target.dependents;
          for (const dependent of dependents) {
            queue.push(dependent);
          }
        }
      }
    }
  }

  getReadyTargets() {
    const readyTargets: Set<WrappedTarget> = new Set();

    for (const target of this.getTargetsByPriority()) {
      // Skip the start target
      if (target.id === getStartTargetId()) {
        continue;
      }

      const targetRun = this.targetRuns.get(target.id)!;

      // If the target is already running, then we can't run it again
      if (targetRun.status === "pending") {
        const targetDeps = targetRun.target.dependencies;

        // Target is only ready when all its deps are "successful" or that it is a root target
        const ready = targetDeps.every((dep) => {
          const fromTarget = this.targetRuns.get(dep)!;
          return fromTarget.successful || dep === getStartTargetId();
        });

        if (ready) {
          readyTargets.add(targetRun);
        }
      }
    }

    return [...readyTargets];
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
      return Promise.resolve();
    }

    this.options.logger.silly(`Max Worker Memory Usage: ${formatBytes(this.pool.stats().maxWorkerMemoryUsage)}`);

    const promises: Promise<any>[] = [];

    for (const nextTarget of this.getReadyTargets()) {
      const runPromise = this.#generateTargetRunPromise(nextTarget);
      promises.push(runPromise);
    }

    await Promise.all(promises);
  }

  logProgress() {
    const targetRunByStatus = categorizeTargetRuns(this.targetRuns.values());
    const total = [...this.targetRuns.values()].filter((t) => !t.target.hidden).length;

    this.options.logger.verbose("", {
      poolStats: this.pool.stats(),
      progress: {
        waiting: targetRunByStatus.pending.length + targetRunByStatus.queued.length,
        completed:
          targetRunByStatus.aborted.length +
          targetRunByStatus.failed.length +
          targetRunByStatus.skipped.length +
          targetRunByStatus.success.length,
        total,
      },
    });
  }

  async #generateTargetRunPromise(target: WrappedTarget) {
    let runError: unknown | undefined;

    if (!target.successful || this.rerunTargets.has(target.target.id)) {
      // This do-while loop only runs again if something causes this target to rerun (asynchronously triggering a re-run)
      do {
        this.rerunTargets.delete(target.target.id);
        target.onQueued();

        try {
          let shouldRun = true;

          try {
            const runner = await this.runnerPicker.pick(target.target);
            shouldRun = await runner.shouldRun(target.target);
          } catch (e) {
            // pass - default to run anyway
          }

          if (shouldRun) {
            await target.run();
          } else {
            target.onSkipped();
          }
        } catch (e) {
          runError = e;
        }
      } while (this.rerunTargets.has(target.target.id));

      // if a continue option is set, this merely records what errors have been encountered
      // it'll continue down the execution until all the tasks that still works
      if (runError && !this.options?.continueOnError) {
        if (!this.options?.continueOnError) {
          // immediately reject, if not using "continue" option
          throw runError;
        }
      }
    }

    this.logProgress();

    // finally do another round of scheduling to run next round of targets
    await this.scheduleReadyTargets();
  }

  async cleanup() {
    this.options.logger.silly(`Max Worker Memory Usage: ${formatBytes(this.pool.stats().maxWorkerMemoryUsage)}`);
    await this.pool.close();
  }

  /**
   * Abort the scheduler using the abort controller.
   */
  abort() {
    this.abortController.abort();
  }
}
encodeURI;
