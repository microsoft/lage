import { TargetHasher } from "@lage-run/hasher";
import { Logger } from "@lage-run/logger";
import type { TargetRunner } from "@lage-run/runners";
import type { Target } from "@lage-run/target-graph";
import type { Pool } from "@lage-run/worker-threads-pool";
import fs from "fs";
import os from "os";
import path from "path";
import { WrappedTarget } from "../src/WrappedTarget.js";

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
  exec(data: { target: Target; weight: number }, _weight: number, _setup: any, _teardown: any, abortSignal?: AbortSignal) {
    return this.runner.run({ target: data.target, weight: data.weight, abortSignal });
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

class SkippyInProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  async exec(
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
  let root = "";

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "lage-wrapped-target-"));
  });

  it("should be able to run a target to completion", async () => {
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
});
