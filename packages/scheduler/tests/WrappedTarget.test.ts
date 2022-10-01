import { Target } from "@lage-run/target-graph";
import { WrappedTarget } from "../src/WrappedTarget";

import path from "path";
import AbortController, { AbortSignal } from "abort-controller";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { Logger } from "@lage-run/logger";
import { TargetRunner } from "../src/types/TargetRunner";
import { rejects } from "assert";
import { createCipheriv } from "crypto";

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
      hash(target: Target) {},
    } as TargetHasher;

    const logger = new Logger();

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
    });

    const runner = {
      async run(target: Target, abortSignal?: AbortSignal) {
        // nothing
      },
    } as TargetRunner;

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run(runner);

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
      });

      wrappedTargets.push(wrappedTarget);
    }

    const runner = {
      async run(target: Target, abortSignal?: AbortSignal) {
        // nothing
      },
    } as TargetRunner;

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run(runner));

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
      });

      wrappedTargets.push(wrappedTarget);
    }

    const oops = new Error("oops");

    const runner = {
      async run(target: Target, abortSignal?: AbortSignal) {
        // nothing
        if (target.packageName === "a") {
          throw oops;
        }
      },
    } as TargetRunner;

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run(runner));

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
      });

      wrappedTargets.push(wrappedTarget);
    }

    const oops = new Error("oops");

    const runner = {
      run(target: Target, abortSignal?: AbortSignal) {
        return new Promise((resolve, reject) => {
          if (target.packageName === "a") {
            reject(oops);
          }

          const timeout = setTimeout(() => {
            resolve();
          }, 50000);

          abortSignal?.addEventListener("abort", () => {
            timeout?.unref();
            reject(new Error("aborted"));
          });
        });
      },
    } as TargetRunner;

    const runPromises = wrappedTargets.map((wrappedTarget) => wrappedTarget.run(runner));

    await expect(Promise.all(runPromises)).rejects.toBe(oops);

    expect(wrappedTargets.some((t) => t.status === "aborted")).toBeTruthy();
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
    });

    const runner = {
      async run(target: Target, abortSignal?: AbortSignal) {
        // nothing
      },
    } as TargetRunner;

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run(runner);

    expect(wrappedTarget.status).toBe("skipped");
  });
});
