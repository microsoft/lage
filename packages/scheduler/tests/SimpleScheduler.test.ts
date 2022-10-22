import { Logger } from "@lage-run/logger";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { getStartTargetId, Target, TargetGraph } from "@lage-run/target-graph";
import { Pool } from "@lage-run/worker-threads-pool";
import { TargetRunner } from "@lage-run/scheduler-types";

class InProcPool implements Pool {
  constructor(private runner: TargetRunner) {}
  exec({ target }: { target: Target }) {
    return this.runner.run({ target });
  }
  close() {
    return Promise.resolve();
  }
}

class SingleSchedulePool implements Pool {
  count = 0;
  constructor(private runner: TargetRunner, private concurrency: number) {}
  exec({ target }: { target: Target }) {
    if (this.concurrency > this.count) {
      this.count++;
      return this.runner.run({ target });
    }

    return Promise.reject(new Error("Pool is full"));
  }
  close() {
    return Promise.resolve();
  }
}

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
      dependencies: [],
      dependents: [],
      depSpecs: [],
    } as Target);

    // auto inject the start target id to each target
    if (!this.dependencies.some((dep) => dep[0] === packageName && dep[1] == task)) {
      this.dependencies.push([getStartTargetId(), id]);
    }

    return this as TestTargetGraph;
  }

  addDependency(from: string, to: string) {
    this.dependencies.push([from, to]);
    this.targets.get(from)!.dependencies.push(to);
    this.targets.get(to)!.dependencies.push(from);
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

    const runner = new (require("./fixtures/NoOpRunner").NoOpRunner)();

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 1,
      cacheProvider,
      hasher,
      continueOnError: false,
      shouldCache: true,
      shouldResetCache: false,
      maxWorkersPerTask: new Map(),
      runners: {},
      pool: new InProcPool(runner),
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph().addTarget("a", "build").addTarget("b", "build");

    await scheduler.run(root, targetGraph);

    expect(scheduler.targetRuns).toMatchInlineSnapshot(`
      Map {
        "__start" => {
          "status": "success",
          "target": "__start",
        },
        "a#build" => {
          "status": "success",
          "target": "a#build",
        },
        "b#build" => {
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

    const runner = new (require("./fixtures/FailOnPackageRunner").FailOnPackageRunner)("d");

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 1,
      cacheProvider,
      hasher,
      runners: {},
      pool: new InProcPool(runner),
      maxWorkersPerTask: new Map(),
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

    const wrappedTargets = scheduler.targetRuns;
    expect(wrappedTargets.size).toBe(6);
    expect(wrappedTargets.get("d#build")!.status).not.toBe("success");

    // expect([...wrappedTargets.values()].some((t) => t.status === "aborted")).toBeTruthy();
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
    const runner = new (require("./fixtures/FailOnPackageRunner").FailOnPackageRunner)("d");

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
      cacheProvider,
      hasher,
      continueOnError: true,
      shouldCache: true,
      shouldResetCache: false,
      maxWorkersPerTask: new Map(),
      runners: {},
      pool: new InProcPool(runner),
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

    const wrappedTargets = scheduler.targetRuns;
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

    const runner = new (require("./fixtures/FailOnPackageRunner").FailOnPackageRunner)("d");

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
      cacheProvider,
      hasher,
      maxWorkersPerTask: new Map(),
      continueOnError: true,
      shouldCache: true,
      shouldResetCache: false,
      runners: {},
      pool: new SingleSchedulePool(runner, 4),
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
      {
        "error": undefined,
        "results": "failed",
        "targetRunByStatus": {
          "aborted": [
            "g#build",
          ],
          "failed": [],
          "pending": [
            "b#build",
            "d#build",
          ],
          "queued": [],
          "running": [],
          "skipped": [],
          "success": [
            "__start",
            "a#build",
            "c#build",
            "e#build",
            "f#build",
          ],
        },
        "targetRuns": Map {
          "__start" => {
            "status": "success",
            "target": "__start",
          },
          "a#build" => {
            "status": "success",
            "target": "a#build",
          },
          "b#build" => {
            "status": "pending",
            "target": "b#build",
          },
          "c#build" => {
            "status": "success",
            "target": "c#build",
          },
          "d#build" => {
            "status": "pending",
            "target": "d#build",
          },
          "e#build" => {
            "status": "success",
            "target": "e#build",
          },
          "f#build" => {
            "status": "success",
            "target": "f#build",
          },
          "g#build" => {
            "status": "aborted",
            "target": "g#build",
          },
        },
      }
    `);
  });
});
