import { Target } from "@lage-run/target-graph";
import { WrappedTarget } from "../src/WrappedTarget";

import path from "path";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { Logger } from "@lage-run/logger";
import { TargetRunner } from "@lage-run/scheduler-types";
import { Pool } from "@lage-run/worker-threads-pool";

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
  exec({ target }: { target: Target; weight: number }, weight, _setup, _teardown, abortSignal?: AbortSignal) {
    return this.runner.run({ target, weight, abortSignal });
  }
  stats() {
    return {
      workerRestarts: 0,
      maxWorkerMemoryUsage: 0,
    };
  }
  close() {
    return Promise.resolve();
  }
}

describe("WrappedTarget", () => {
  it("should be able to run a target to completion", async () => {
    const cacheProvider = {
      async clear() {},
      async fetch() {
        return false;
      },
      async purge() {},
      async put() {},
    } as CacheProvider;

    const hasher = {
      hash(_target: Target) {},
    } as TargetHasher;

    const logger = new Logger();

    const runner = {
      async shouldRun() {
        return true;
      },
      async run() {
        // nothing
      },
    } as TargetRunner;

    const wrappedTarget = new WrappedTarget({
      abortController: new AbortController(),
      cacheProvider,
      continueOnError: false,
      hasher,
      logger,
      root: process.cwd(),
      shouldCache: true,
      shouldResetCache: false,
      target: createTarget("a"),
      pool: new InProcPool(runner),
    });

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("success");
  });

  it("should be able to run many targets to completion", async () => {
    const cacheProvider = {
      async clear() {},
      async fetch() {
        return false;
      },
      async purge() {},
      async put() {},
    } as CacheProvider;

    const hasher = {
      hash(target: Target) {},
    } as TargetHasher;

    const logger = new Logger();

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const wrappedTargets: WrappedTarget[] = [];

    const runner = {
      async shouldRun() {
        return true;
      },
      async run() {
        // nothing
      },
    } as TargetRunner;

    for (const packageName of fakePackages) {
      const wrappedTarget = new WrappedTarget({
        abortController: new AbortController(),
        cacheProvider,
        continueOnError: false,
        hasher,
        logger,
        root: process.cwd(),
        shouldCache: true,
        shouldResetCache: false,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
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

    const cacheProvider = {
      async clear() {},
      async fetch() {
        return false;
      },
      async purge() {},
      async put() {},
    } as CacheProvider;

    const hasher = {
      hash(target: Target) {},
    } as TargetHasher;

    const logger = new Logger();

    const fakePackages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const wrappedTargets: WrappedTarget[] = [];

    const runner = {
      async run({ target }) {
        // nothing
        if (target.packageName === "a") {
          throw oops;
        }
      },
    } as TargetRunner;

    for (const packageName of fakePackages) {
      const wrappedTarget = new WrappedTarget({
        abortController: new AbortController(),
        cacheProvider,
        continueOnError,
        hasher,
        logger,
        root: process.cwd(),
        shouldCache: true,
        shouldResetCache: false,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
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

    const cacheProvider = {
      async clear() {},
      async fetch() {
        return true;
      },
      async purge() {},
      async put() {},
    } as CacheProvider;

    const hasher = {
      hash(target: Target) {},
    } as TargetHasher;

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
        cacheProvider,
        continueOnError,
        hasher,
        logger,
        root: process.cwd(),
        shouldCache: true,
        shouldResetCache: false,
        target: createTarget(packageName),
        pool: new InProcPool(runner),
      });

      wrappedTargets.push(wrappedTarget);
    }

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run());

    await expect(Promise.all(runPromises)).rejects.toBe(oops);

    expect(abortController.signal.aborted).toBeTruthy();
  });

  it("should skip the work if cache is hit", async () => {
    const cacheProvider = {
      async clear() {},
      async fetch() {
        return true;
      },
      async purge() {},
      async put() {},
    } as CacheProvider;

    const hasher = {
      async hash(target: Target) {
        return "xyz";
      },
    } as TargetHasher;

    const logger = new Logger();

    const runner = {
      async shouldRun() {
        return true;
      },
      async run() {
        // nothing
      },
    } as TargetRunner;

    const wrappedTarget = new WrappedTarget({
      abortController: new AbortController(),
      cacheProvider,
      continueOnError: false,
      hasher,
      logger,
      root: process.cwd(),
      shouldCache: true,
      shouldResetCache: false,
      target: { ...createTarget("a"), cache: true },
      pool: new InProcPool(runner),
    });

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("skipped");
  });
});
