import { Logger } from "@lage-run/logger";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { TargetRunner } from "../src/types/TargetRunner";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { getStartTargetId, Target, TargetGraph } from "@lage-run/target-graph";
import { NoOpRunner } from "../src/runners/NoOpRunner";
import { TargetRunnerPicker } from "../src/runners/TargetRunnerPicker";

/**
 * Purely manually managed target graph.
 * 1. It doesn't gaurantee that the targets' dependencies are the same as the graph's dependencies.
 * 2. It will auto create a startTargetId -> each target's id.
 */
class TestTargetGraph implements TargetGraph {
  targets: Map<string, Target> = new Map([
    [
      getStartTargetId(),
      {
        id: getStartTargetId(),
        cwd: "",
        label: "Start",
      },
    ] as [string, Target],
  ]);

  dependencies: [string, string][] = [];

  addTarget(packageName: string, task: string) {
    const id = `${packageName}#${task}`;

    this.targets.set(id, {
      id,
      label: `${packageName} - ${task}`,
      packageName,
      task,
      cwd: `packages/${packageName}`,
      dependencies: [], // this is unused by schedulers
    } as Target);

    // auto inject the start target id to each target
    if (!this.dependencies.some((dep) => dep[0] === packageName && dep[1] == task)) {
      this.dependencies.push([getStartTargetId(), id]);
    }

    return this as TestTargetGraph;
  }

  addDependency(from: string, to: string) {
    this.dependencies.push([from, to]);
    return this as TestTargetGraph;
  }
}

function dropTiming(obj: any) {
  const { startTime, duration, ...rest } = obj;
  return rest;
}

describe("SimpleScheduler", () => {
  it("should run all targets, if no target dependencies exists in the target graph", async () => {
    const root = "/root-of-repo";
    const logger = new Logger();

    const cacheProvider: CacheProvider = {
      clear: jest.fn(),
      fetch: jest.fn(),
      put: jest.fn(),
      purge: jest.fn(),
    };

    const hasher = new TargetHasher({ root, environmentGlob: [] });

    const runner = NoOpRunner;
    const runnerPicker = new TargetRunnerPicker({
      runners: { npmScript: runner },
    });

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 1,
      cacheProvider,
      hasher,
      runnerPicker,
      continueOnError: false,
      shouldCache: true,
      shouldResetCache: false,
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph().addTarget("a", "build").addTarget("b", "build");

    await scheduler.run(root, targetGraph);

    expect(scheduler.wrappedTargets).toMatchInlineSnapshot(`
      Map {
        "__start" => Object {
          "status": "success",
          "target": "__start",
        },
        "a#build" => Object {
          "status": "success",
          "target": "a#build",
        },
        "b#build" => Object {
          "status": "success",
          "target": "b#build",
        },
      }
    `);
  });

  it("should abort early throwing an error, if one target fails without continue on error", async () => {
    const root = "/root-of-repo";
    const logger = new Logger();

    const cacheProvider: CacheProvider = {
      clear: jest.fn(),
      fetch: jest.fn(),
      put: jest.fn(),
      purge: jest.fn(),
    };

    const hasher = new TargetHasher({ root, environmentGlob: [] });

    const runner = {
      run(target: Target, abortSignal?: AbortSignal) {
        return new Promise((resolve, reject) => {
          if (target.packageName === "d") {
            reject(new Error("oops"));
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

    const runnerPicker = new TargetRunnerPicker({
      runners: { npmScript: runner },
    });

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
      cacheProvider,
      hasher,
      runnerPicker,
      continueOnError: false,
      shouldCache: true,
      shouldResetCache: false,
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph()
      .addTarget("a", "build")
      .addTarget("b", "build")
      .addTarget("c", "build")
      .addTarget("d", "build")
      .addTarget("e", "build");

    targetGraph.addDependency("d#build", "b#build");

    await scheduler.run(root, targetGraph);

    const wrappedTargets = scheduler.wrappedTargets;
    expect(wrappedTargets.size).toBe(6);
    expect(wrappedTargets.get("d#build")!.status).not.toBe("success");

    expect([...wrappedTargets.values()].some((t) => t.status === "aborted")).toBeTruthy();
  });

  it("should either be success or failed, if one target fails with continue on error", async () => {
    const root = "/root-of-repo";
    const logger = new Logger();

    const cacheProvider: CacheProvider = {
      clear: jest.fn(),
      fetch: jest.fn(),
      put: jest.fn(),
      purge: jest.fn(),
    };

    const hasher = new TargetHasher({ root, environmentGlob: [] });

    const runner = {
      run(target: Target, abortSignal?: AbortSignal) {
        return new Promise((resolve, reject) => {
          if (target.packageName === "d") {
            reject(new Error("oops"));
          }

          const timeout = setTimeout(() => {
            resolve();
          }, 50);

          abortSignal?.addEventListener("abort", () => {
            timeout?.unref();
            reject(new Error("aborted"));
          });
        });
      },
    } as TargetRunner;

    const runnerPicker = new TargetRunnerPicker({
      runners: { npmScript: runner },
    });

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
      cacheProvider,
      hasher,
      runnerPicker,
      continueOnError: true,
      shouldCache: true,
      shouldResetCache: false,
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph()
      .addTarget("a", "build")
      .addTarget("b", "build")
      .addTarget("c", "build")
      .addTarget("d", "build")
      .addTarget("e", "build")
      .addTarget("f", "build")
      .addTarget("g", "build");

    targetGraph.addDependency("d#build", "b#build");

    await scheduler.run(root, targetGraph);

    const wrappedTargets = scheduler.wrappedTargets;
    expect(wrappedTargets.get("d#build")!.status).not.toBe("success");

    expect([...wrappedTargets.values()].some((t) => t.status === "aborted")).toBeFalsy();
  });

  it("should return expected summary, aborted case", async () => {
    const root = "/root-of-repo";
    const logger = new Logger();

    const cacheProvider: CacheProvider = {
      clear: jest.fn(),
      fetch: jest.fn(),
      put: jest.fn(),
      purge: jest.fn(),
    };

    const hasher = new TargetHasher({ root, environmentGlob: [] });

    const runner = {
      run(target: Target, abortSignal?: AbortSignal) {
        return new Promise((resolve, reject) => {
          if (target.packageName === "d") {
            reject(new Error("oops"));
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

    const runnerPicker = new TargetRunnerPicker({
      runners: { npmScript: runner },
    });

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
      cacheProvider,
      hasher,
      runnerPicker,
      continueOnError: true,
      shouldCache: true,
      shouldResetCache: false,
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph()
      .addTarget("a", "build")
      .addTarget("b", "build")
      .addTarget("c", "build")
      .addTarget("d", "build")
      .addTarget("e", "build")
      .addTarget("f", "build")
      .addTarget("g", "build");

    targetGraph.addDependency("d#build", "b#build");

    const schedulerPromise = scheduler.run(root, targetGraph);
    scheduler.abort();
    const summary = await schedulerPromise;

    expect(dropTiming(summary)).toMatchInlineSnapshot(`
Object {
  "error": undefined,
  "results": "failed",
  "targetRunByStatus": Object {
    "aborted": Array [],
    "failed": Array [],
    "pending": Array [
      "a#build",
      "b#build",
      "c#build",
      "d#build",
      "e#build",
      "f#build",
      "g#build",
    ],
    "running": Array [],
    "skipped": Array [],
    "success": Array [
      "__start",
    ],
  },
  "targetRuns": Map {
    "__start" => Object {
      "status": "success",
      "target": "__start",
    },
    "a#build" => Object {
      "status": "pending",
      "target": "a#build",
    },
    "b#build" => Object {
      "status": "pending",
      "target": "b#build",
    },
    "c#build" => Object {
      "status": "pending",
      "target": "c#build",
    },
    "d#build" => Object {
      "status": "pending",
      "target": "d#build",
    },
    "e#build" => Object {
      "status": "pending",
      "target": "e#build",
    },
    "f#build" => Object {
      "status": "pending",
      "target": "f#build",
    },
    "g#build" => Object {
      "status": "pending",
      "target": "g#build",
    },
  },
}
`);
  });
});
