import { controller } from "./abortSignal";
import { hrToSeconds } from "./formatDuration";
import { Logger } from "@lage-run/logger";
import { TargetHasher } from "@lage-run/cache";
import type { CacheProvider } from "@lage-run/cache";
import type { ChildProcess } from "child_process";
import type { Target } from "@lage-run/target-graph";
import { TargetRunner } from "./types/TargetRunner";

type TargetStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface WrappedTargetOptions {
  root: string;
  target: Target;
  logger: Logger;
  cacheProvider: CacheProvider;
  hasher: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  continueOnError: boolean;
}

export class WrappedTarget {
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  target: Target;
  status: TargetStatus;

  constructor(public options: WrappedTargetOptions) {
    this.status = "pending";
    this.target = options.target;
  }

  onStart() {
    this.status = "running";
    this.startTime = process.hrtime();
    this.options.logger.info("started", { status: "started" });
  }

  onComplete() {
    this.status = "success";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("completed", {
      status: "completed",
      duration: hrToSeconds(this.duration),
    });
  }

  onFail() {
    this.status = "failed";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info("failed", {
      status: "failed",
      duration: hrToSeconds(this.duration),
    });
  }

  onSkipped(hash: string | null) {
    this.status = "skipped";
    this.duration = process.hrtime(this.startTime);
    this.options.logger.info(`skipped`, {
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
    const { target, logger, shouldCache, continueOnError } = this.options;

    try {
      const { hash, cacheHit } = await this.getCache();

      const cacheEnabled = target.cache && shouldCache && hash;

      this.onStart();

      if (target.run) {
        // skip if cache hit!
        if (cacheHit) {
          // save the cache anyway - this will cause remote cache to be saved locally
          if (cacheEnabled) {
            await this.saveCache(hash);
          }

          this.onSkipped(hash);
          return true;
        }

        if (cacheEnabled) {
          logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`);
        }

        await runner.run(target);

        if (cacheEnabled) {
          await this.saveCache(hash);
        }
      }
      this.onComplete();
    } catch (e) {
      this.onFail();

      if (!continueOnError) {
        controller.abort();
      }

      throw e;
    }

    return true;
  }
}
