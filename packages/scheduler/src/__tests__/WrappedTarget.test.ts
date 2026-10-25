import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TargetHasher } from "@lage-run/hasher";
import { Logger } from "@lage-run/logger";
import type { TargetRunner } from "@lage-run/runners";
import type { Target } from "@lage-run/target-graph";
import { WorkerPool, type Pool } from "@lage-run/worker-threads-pool";
import path from "path";
import { createTempDir } from "@lage-run/test-utilities";
import { WrappedTarget } from "../WrappedTarget.js";

function createTarget(packageName: string): Target {
  return {
    cwd: path.resolve(__dirname, "fixtures/package-a"),
    dependencies: [],
    dependents: [],
    depSpecs: [],
    label: "",
    id: `${packageName}#build`,
    task: "build",
    packageName,
  };
}

class InProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  public exec(data: { target: Target; weight: number }, _weight: number, _setup: any, _teardown: any, abortSignal?: AbortSignal) {
    return this.runner.run({ target: data.target, weight: data.weight, abortSignal });
  }
  public stats() {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  public close() {
    return Promise.resolve();
  }
}

class SkippyInProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  public async exec(
    data: { target: Target; weight: number },
    _weight: number,
    _setup: any,
    _teardown: any,
    abortSignal?: AbortSignal
  ): Promise<any> {
    await this.runner.run({ target: data.target, weight: data.weight, abortSignal });
    return Promise.resolve({
      skipped: true,
      hash: "1234",
    });
  }
  public stats() {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  public close() {
    return Promise.resolve();
  }
}

describe("WrappedTarget", () => {
  let root = "";

  beforeEach(() => {
    root = createTempDir({ prefix: "lage-wrapped-target-" });
  });

  function createCacheTest(
    overrides: {
      mockHash?: string | Error;
      skippy?: boolean;
      shouldCache?: boolean;
      experimentalCacheHitOptimization?: boolean;
      targetCache?: boolean;
      abortController?: AbortController;
      localCacheProvider?: { isUpToDate(hash: string, target: Target): Promise<boolean> };
    } = {}
  ) {
    const {
      mockHash = "cached-hash",
      skippy = false,
      shouldCache = true,
      targetCache = true,
      abortController = new AbortController(),
    } = overrides;
    const logger = new Logger();
    const hasher = new TargetHasher({ root, environmentGlob: [] });
    const hashSpy = jest.spyOn(hasher, "hash");
    if (mockHash instanceof Error) {
      hashSpy.mockRejectedValue(mockHash);
    } else {
      hashSpy.mockResolvedValue(mockHash);
    }
    const runner: TargetRunner = { shouldRun: () => Promise.resolve(true), async run() {} };
    const pool = skippy ? new SkippyInProcPool(runner) : new InProcPool(runner);
    const exec = jest.spyOn(pool, "exec");
    const target = { ...createTarget("a"), cache: targetCache };
    const wrappedTarget = new WrappedTarget({
      abortController,
      continueOnError: false,
      logger,
      root,
      shouldCache,
      experimentalCacheHitOptimization: "experimentalCacheHitOptimization" in overrides ? overrides.experimentalCacheHitOptimization : true,
      target,
      pool,
      hasher,
      ...("localCacheProvider" in overrides ? { localCacheProvider: overrides.localCacheProvider } : {}),
    });
    return { wrappedTarget, logger, hasher, hashSpy, pool, exec, target, abortController };
  }

  it("should be able to run a target to completion", async () => {
    const logger = new Logger();

    const runner: TargetRunner = {
      shouldRun: () => Promise.resolve(true),
      async run() {},
    };

    const wrappedTarget = new WrappedTarget({
      abortController: new AbortController(),
      continueOnError: false,
      logger,
      root,
      shouldCache: true,
      target: createTarget("a"),
      pool: new InProcPool(runner),
      hasher: new TargetHasher({ root, environmentGlob: [] }),
    });

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("success");
  });

  it("should be able to run many targets to completion", async () => {
    const logger = new Logger();

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const wrappedTargets: WrappedTarget[] = [];

    const runner: TargetRunner = {
      shouldRun: () => Promise.resolve(true),
      async run() {},
    };

    for (const packageName of fakePackages) {
      const wrappedTarget = new WrappedTarget({
        abortController: new AbortController(),
        continueOnError: false,
        logger,
        root,
        shouldCache: true,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
        hasher: new TargetHasher({ root, environmentGlob: [] }),
      });

      wrappedTargets.push(wrappedTarget);
    }

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run());

    await Promise.all(runPromises);

    for (const wrappedTarget of wrappedTargets) {
      expect(wrappedTarget.status).toBe("success");
    }
  });

  it("should be able to carry to completion all the wrapped targets even if one had an exception", async () => {
    const continueOnError = true; // This is the ONLY difference between the continueOnError tests

    const logger = new Logger();

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const wrappedTargets: WrappedTarget[] = [];

    const runner: TargetRunner = {
      shouldRun: () => Promise.resolve(true),
      // eslint-disable-next-line @typescript-eslint/require-await
      async run({ target }) {
        if (target.packageName === "a") {
          throw oops;
        }
      },
    };

    for (const packageName of fakePackages) {
      const wrappedTarget = new WrappedTarget({
        abortController: new AbortController(),
        continueOnError,
        logger,
        root,
        shouldCache: true,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
        hasher: new TargetHasher({ root, environmentGlob: [] }),
      });

      wrappedTargets.push(wrappedTarget);
    }

    const oops = new Error("oops");

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run());

    await expect(Promise.all(runPromises)).rejects.toThrow(oops);

    for (const wrappedTarget of wrappedTargets) {
      expect(wrappedTarget.status).not.toBe("pending");
    }
  });

  it("should be able to abort all the wrapped targets even if one had an exception, with continueOnError = false", async () => {
    const continueOnError = false; // This is the ONLY difference between the continueOnError tests

    const logger = new Logger();

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const wrappedTargets: WrappedTarget[] = [];
    const abortController = new AbortController();
    const oops = new Error("oops");

    const runner = {
      run({ target, abortSignal }) {
        return new Promise((resolve, reject) => {
          if (target.packageName === "a") {
            reject(oops);
          }

          const timeout = setTimeout(() => {
            resolve();
          }, 50000);

          abortSignal!.addEventListener("abort", () => {
            timeout?.unref();
            reject(new Error("aborted"));
          });
        });
      },
    } as TargetRunner;

    for (const packageName of fakePackages) {
      const wrappedTarget = new WrappedTarget({
        abortController,
        continueOnError,
        logger,
        root,
        shouldCache: true,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
        hasher: new TargetHasher({ root, environmentGlob: [] }),
      });

      wrappedTargets.push(wrappedTarget);
    }

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run());

    await expect(Promise.all(runPromises)).rejects.toBe(oops);

    expect(abortController.signal.aborted).toBeTruthy();
  });

  it("should skip the work if cache is hit", async () => {
    const logger = new Logger();
    const hasher = new TargetHasher({ root, environmentGlob: [] });
    jest.spyOn(hasher, "hash").mockResolvedValue("1234");

    const runner: TargetRunner = {
      shouldRun: () => Promise.resolve(true),
      async run() {},
    };

    const wrappedTarget = new WrappedTarget({
      abortController: new AbortController(),
      continueOnError: false,
      logger,
      root,
      shouldCache: true,
      target: { ...createTarget("a"), cache: true },
      pool: new SkippyInProcPool(runner),
      hasher,
    });

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("skipped");
  });

  it("skips intact local outputs without starting a worker", async () => {
    const localCacheProvider = {
      isUpToDate: jest.fn<(hash: string, target: Target) => Promise<boolean>>().mockResolvedValue(true),
    };
    const { wrappedTarget, hashSpy, exec, target } = createCacheTest({ skippy: true, localCacheProvider });

    await expect(wrappedTarget.run()).resolves.toMatchObject({ skipped: true, hash: "cached-hash", id: target.id });

    expect(wrappedTarget.status).toBe("skipped");
    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(localCacheProvider.isUpToDate).toHaveBeenCalledWith("cached-hash", target);
    expect(exec).not.toHaveBeenCalled();
    expect(wrappedTarget.threadId).toBe(0);
  });

  it.each([undefined, false])("keeps worker dispatch and skips preflight validation without opt-in (%s)", async (enabled) => {
    const localCacheProvider = {
      isUpToDate: jest.fn<(hash: string, target: Target) => Promise<boolean>>().mockResolvedValue(true),
    };
    const { wrappedTarget, hashSpy, exec, target } = createCacheTest({
      skippy: true,
      localCacheProvider,
      experimentalCacheHitOptimization: enabled,
    });

    await wrappedTarget.run();

    expect(hashSpy).not.toHaveBeenCalled();
    expect(localCacheProvider.isUpToDate).not.toHaveBeenCalled();
    expect(exec.mock.calls[0][0]).toEqual({ target });
    expect(wrappedTarget.status).toBe("skipped");
  });

  it("passes the input hash to the worker when outputs need restoration", async () => {
    const localCacheProvider = {
      isUpToDate: jest.fn<(hash: string, target: Target) => Promise<boolean>>().mockResolvedValue(false),
    };
    const { wrappedTarget, exec, target } = createCacheTest({ skippy: true, localCacheProvider });

    await wrappedTarget.run();

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0][0]).toEqual({ target, hash: "cached-hash" });
  });

  it.each([true, false])("honors cancellation during local cache validation (hit: %s)", async (cacheHit) => {
    const abortController = new AbortController();
    const { wrappedTarget, exec } = createCacheTest({
      abortController,
      localCacheProvider: {
        isUpToDate() {
          abortController.abort();
          return Promise.resolve(cacheHit);
        },
      },
    });

    await expect(wrappedTarget.run()).resolves.toBeUndefined();

    expect(wrappedTarget.status).toBe("aborted");
    expect(exec).not.toHaveBeenCalled();
  });

  it.each([
    { shouldCache: false, targetCache: true },
    { shouldCache: true, targetCache: false },
  ])("does not check local outputs when caching is disabled (%j)", async ({ shouldCache, targetCache }) => {
    const localCacheProvider = {
      isUpToDate: jest.fn<(hash: string, target: Target) => Promise<boolean>>(),
    };
    const { wrappedTarget, hashSpy, exec } = createCacheTest({ shouldCache, targetCache, localCacheProvider });

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("success");
    expect(hashSpy).not.toHaveBeenCalled();
    expect(localCacheProvider.isUpToDate).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("fails promptly when hashing fails instead of leaving a worker waiting for a hash", async () => {
    const { wrappedTarget, logger, exec } = createCacheTest({ mockHash: new Error("Cannot read build input") });
    const error = jest.spyOn(logger, "error");

    await expect(wrappedTarget.run()).rejects.toThrow("Cannot read build input");

    expect(wrappedTarget.status).toBe("failed");
    expect(error).toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  it("fails even when a legacy worker ignores hash errors, then reuses the pool", async () => {
    const failure = new Error("Cannot read build input");
    const { wrappedTarget, hashSpy, abortController } = createCacheTest({
      experimentalCacheHitOptimization: false,
      mockHash: failure,
    });
    const pool = new WorkerPool({
      script: path.join(__dirname, "fixtures", "legacy-hash-worker.cjs"),
      minWorkers: 0,
      maxWorkers: 1,
    });
    wrappedTarget.options.pool = pool;
    wrappedTarget.options.continueOnError = true;
    try {
      await expect(wrappedTarget.run()).rejects.toBe(failure);
      expect(wrappedTarget.status).toBe("failed");
      expect(abortController.signal.aborted).toBe(false);

      hashSpy.mockResolvedValue("recovery-hash");
      const recovery = new WrappedTarget(wrappedTarget.options);
      await expect(recovery.run()).resolves.toMatchObject({ skipped: true, hash: "recovery-hash" });
    } finally {
      await pool.close();
    }
  });
});
