import { bufferTransform } from "./bufferTransform";
import { getLageOutputCacheLocation } from "./getLageOutputCacheLocation";
import { hrToSeconds } from "./formatDuration";
import { LogLevel } from "@lage-run/logger";

import fs from "fs";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

import type { AbortController } from "abort-controller";
import type { CacheProvider } from "@lage-run/cache";
import type { Pool } from "@lage-run/worker-threads-pool";
import type { TargetHasher } from "@lage-run/cache";
import type { TargetRun, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import type { Logger } from "@lage-run/logger";

export interface WrappedTargetOptions {
  root: string;
  target: Target;
  logger: Logger;
  cacheProvider?: CacheProvider;
  hasher?: TargetHasher;
  shouldCache: boolean;
  shouldResetCache: boolean;
  continueOnError: boolean;
  abortController: AbortController;
  pool: Pool;
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

  get abortController() {
    return this.options.abortController;
  }

  set abortController(abortController: AbortController) {
    this.options.abortController = abortController;
  }

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

    if (!this.options.continueOnError && this.options.abortController) {
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

    if (!shouldCache || !target.cache || !cacheProvider || !hasher) {
      return { hash, cacheHit };
    }

    hash = await hasher.hash(target);

    if (hash && !shouldResetCache) {
      cacheHit = await cacheProvider.fetch(hash, target);
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, target, cacheProvider } = this.options;
    if (!hash || !cacheProvider) {
      return;
    }

    logger.verbose(`hash put ${hash}`, { target });

    await cacheProvider.put(hash, target);
  }

  async run() {
    const { target, logger, shouldCache, abortController, pool } = this.options;

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

        if (fs.existsSync(cachedOutputFile)) {
          const cachedOutput = fs.createReadStream(cachedOutputFile, "utf8");
          this.options.logger.verbose(">> Replaying cached output", { target });
          this.options.logger.stream(LogLevel.verbose, cachedOutput, { target });

          return await new Promise<void>((resolve) => {
            cachedOutput.on("close", () => {
              this.onSkipped(hash);
              resolve();
            });
          });
        }

        this.onSkipped(hash);
        return;
      }

      let releaseStdout: any;
      let releaseStderr: any;

      const bufferStdout = bufferTransform();
      const bufferStderr = bufferTransform();

      await pool.exec(
        { target },
        (_worker, stdout, stderr) => {
          stdout.pipe(bufferStdout.transform);
          stderr.pipe(bufferStderr.transform);

          const releaseStdoutStream = logger.stream(LogLevel.verbose, stdout, { target });

          releaseStdout = () => {
            releaseStdoutStream();
            stdout.unpipe(bufferStdout.transform);
          };

          const releaseStderrStream = logger.stream(LogLevel.verbose, stderr, { target });

          releaseStderr = () => {
            releaseStderrStream();
            stderr.unpipe(bufferStderr.transform);
          };
        },
        () => {
          releaseStdout();
          releaseStderr();
        },
        abortSignal
      );

      if (cacheEnabled && hash) {
        await this.saveCache(hash);
        const outputLocation = getLageOutputCacheLocation(this.target, hash);
        const outputPath = path.dirname(outputLocation);
        await mkdir(outputPath, { recursive: true });
        await writeFile(outputLocation, bufferStdout.buffer + bufferStderr.buffer);
      }

      this.onComplete();
    } catch (e) {
      logger.error(String(e), { target });

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
