import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TargetHasher } from "@lage-run/hasher";
import { Logger } from "@lage-run/logger";
import type { TargetRunner } from "@lage-run/runners";
import type { Target } from "@lage-run/target-graph";
import { type Pool, WorkerPool } from "@lage-run/worker-threads-pool";
import { writeFileSync } from "fs";
import path from "path";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
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
      hasher: new TargetHasher({ root, environmentGlob: [] }),
    });

    expect(wrappedTarget.status).toBe("pending");

    await wrappedTarget.run();

    expect(wrappedTarget.status).toBe("skipped");
  });

  it.each([
    { reason: new Error("Failed to hash files"), continueOnError: false },
    { reason: 'Failed to hash file "input.txt"', continueOnError: true },
  ])("settles worker hash failures with continueOnError=$continueOnError", async ({ reason, continueOnError }) => {
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "a" }));
    const logger = new Logger();
    const abortController = new AbortController();
    const hasher = new TargetHasher({ root, environmentGlob: [] });
    const hash = jest.spyOn(hasher, "hash").mockRejectedValueOnce(reason);
    const pool = new WorkerPool({
      maxWorkers: 1,
      script: path.resolve(__dirname, "../../lib/workers/targetWorker.js"),
      workerOptions: {
        workerData: {
          root,
          shouldCache: true,
          shouldResetCache: false,
          skipLocalCache: false,
          taskArgs: [],
          runners: {
            noop: { script: path.resolve(__dirname, "../../../runners/lib/NoOpRunner.js"), options: {} },
          },
        },
      },
    });
    const wrappedTarget = new WrappedTarget({
      abortController,
      continueOnError,
      logger,
      root,
      shouldCache: true,
      target: { ...createTarget("a"), cwd: root, cache: true, type: "noop", outputs: [] },
      pool,
      hasher,
    });
    let timeout: NodeJS.Timeout | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("Timed out waiting for the worker hash request to settle")), 5000);
    });

    try {
      const message = reason instanceof Error ? reason.message : reason;
      await expect(Promise.race([wrappedTarget.run(), timedOut])).rejects.toThrow(message);
      expect(wrappedTarget.status).toBe("failed");
      expect(abortController.signal.aborted).toBe(!continueOnError);

      if (continueOnError) {
        const threadId = wrappedTarget.threadId;
        const nextHash = "a".repeat(40);
        hash.mockResolvedValueOnce(nextHash);
        wrappedTarget.reset();

        await expect(Promise.race([wrappedTarget.run(), timedOut])).resolves.toMatchObject({ skipped: false, hash: nextHash });
        expect(wrappedTarget.status).toBe("success");
        expect(wrappedTarget.threadId).toBe(threadId);
      }
    } finally {
      clearTimeout(timeout);
      await pool.close();
      hash.mockRestore();
      removeTempDir(root);
    }
  });
});
