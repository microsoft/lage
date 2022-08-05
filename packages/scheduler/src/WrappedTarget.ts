import { hrToSeconds } from "./formatDuration";
import { Logger } from "@lage-run/logger";
import { TargetHasher } from "@lage-run/cache";
import type { AbortController } from "abort-controller";
import type { CacheProvider } from "@lage-run/cache";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunContext } from "./types/TargetRunContext";
import type { TargetRunner } from "./types/TargetRunner";
import type { TargetStatus } from "./types/TargetStatus";

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

export class WrappedTarget implements TargetRunContext {
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  target: Target;
  status: TargetStatus;

  constructor(public options: WrappedTargetOptions) {
    this.status = "pending";
    this.target = options.target;
  }

  onAbort() {
    this.status = "running";
    this.options.logger.info("aborted", { target: this.target, status: "aborted" });
  }

  onStart() {
    this.status = "running";
    this.startTime = process.hrtime();
    this.options.logger.info("started", { target: this.target, status: "started" });
  }

  onComplete() {
    this.status = "success";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("completed", {
      target: this.target,
      status: "completed",
      duration: hrToSeconds(this.duration),
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
    logger.verbose(`hash put ${hash}`);

    await cacheProvider.put(hash, target);
  }

  async run(runner: TargetRunner) {
    const { target, logger, shouldCache, abortController } = this.options;

    const abortSignal = abortController.signal;

    if (abortSignal.aborted) {
      this.onAbort();
      return;
    }

    abortSignal.addEventListener("abort", () => {
      this.onAbort();
      return;
    });

    try {
      const { hash, cacheHit } = await this.getCache();

      this.onStart();

      const cacheEnabled = target.cache && shouldCache && hash;
      if (cacheEnabled) {
        logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`);
      }

      // skip if cache hit!
      if (cacheHit) {
        this.onSkipped(hash);
        return;
      }

      await runner.run(target, abortSignal);

      if (cacheEnabled) {
        await this.saveCache(hash);
      }

      this.onComplete();
    } catch (e) {
      this.onFail();
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
