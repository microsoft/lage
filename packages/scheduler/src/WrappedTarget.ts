import { hrToSeconds } from "./formatDuration";
import { Logger, LogLevel } from "@lage-run/logger";
import { TargetHasher } from "@lage-run/cache";
import type { AbortController } from "abort-controller";
import type { CacheProvider } from "@lage-run/cache";
import type { Target } from "@lage-run/target-graph";
import type { TargetRun } from "./types/TargetRun";
import type { TargetRunner } from "./types/TargetRunner";
import type { TargetStatus } from "./types/TargetStatus";
import { getLageOutputCacheLocation } from "./createCachedOutputTransform";
import fs from "fs";

export interface WrappedTargetOptions {
  root: string;
  target: Target;
  logger: Logger;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  continueOnError: boolean;
  abortController: AbortController;
}

/**
 * Wraps a target with additional functionality:
 * 1. Caching
 * 2. Logging
 * 3. Abort signal
 * 4. Continue on error
 */
export class WrappedTarget implements TargetRun {
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  target: Target;
  status: TargetStatus;

  constructor(public options: WrappedTargetOptions) {
    this.status = "pending";
    this.target = options.target;
  }

  onAbort() {
    this.status = "aborted";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("aborted", { target: this.target, status: "aborted" });
  }

  onStart() {
    this.status = "running";
    this.startTime = process.hrtime();
    this.options.logger.info("running", { target: this.target, status: "running" });
  }

  onComplete() {
    this.status = "success";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("success", {
      target: this.target,
      status: "success",
      duration: this.duration,
    });
  }

  onFail() {
    this.status = "failed";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("failed", {
      target: this.target,
      status: "failed",
      duration: hrToSeconds(this.duration),
    });

    if (!this.options.continueOnError) {
      this.options.abortController.abort();
    }
  }

  onSkipped(hash: string | null) {
    this.status = "skipped";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info(`skipped`, {
      target: this.target,
      status: "skipped",
      duration: hrToSeconds(this.duration),
      hash,
    });
  }

  async getCache() {
    const { cacheProvider, hasher } = this.options;
    let hash: string | null = null;
    let cacheHit = false;

    const { target, shouldCache, shouldResetCache } = this.options;

    if (shouldCache && target.cache) {
      hash = await hasher.hash(target);

      if (hash && !shouldResetCache) {
        cacheHit = await cacheProvider.fetch(hash, target);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    if (!hash) {
      return;
    }

    const { logger, target, cacheProvider } = this.options;
    logger.verbose(`hash put ${hash}`, { target });

    await cacheProvider.put(hash, target);
  }

  async run(runner: TargetRunner) {
    const { target, logger, shouldCache, abortController } = this.options;

    this.onStart();
    const abortSignal = abortController.signal;

    if (abortSignal.aborted) {
      this.onAbort();
      return;
    }

    try {
      const { hash, cacheHit } = await this.getCache();

      const cacheEnabled = target.cache && shouldCache && hash;
      if (cacheEnabled) {
        logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`, { target });
      }

      // skip if cache hit!
      if (cacheHit) {
        const cachedOutputFile = getLageOutputCacheLocation(this.target, hash ?? "");
        this.onSkipped(hash);

        if (fs.existsSync(cachedOutputFile)) {
          const cachedOutput = fs.createReadStream(cachedOutputFile, "utf8");
          this.options.logger.verbose(">> Replaying cached output", { target });
          this.options.logger.stream(LogLevel.verbose, cachedOutput, { target });

          return await new Promise<void>((resolve, reject) => {
            cachedOutput.on("close", () => {
              resolve();
            });
          });
        }

        return;
      }

      /**
       * TargetRunner should run() a target. The promise resolves if successful, or rejects otherwise (aborted or failed).
       */

      // TODO: instead of passing a hash, pass in the stderr/stdout transformer streams
      await runner.run(target, abortSignal, hash ?? undefined);

      if (cacheEnabled) {
        await this.saveCache(hash);
      }

      this.onComplete();
    } catch (e) {
      if (abortSignal.aborted) {
        this.onAbort();
      } else {
        this.onFail();
      }

      throw e;
    }
  }

  /**
   * A JSON representation of this wrapped target, suitable for serialization in tests.
   *
   * Skips the unpredictable properties of the wrapped target like the startTime and duration.
   *
   * @returns
   */
  toJSON() {
    return {
      target: this.target.id,
      status: this.status,
    };
  }
}
