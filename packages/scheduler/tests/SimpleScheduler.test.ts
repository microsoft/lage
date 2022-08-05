import { Logger } from "@lage-run/logger";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { TargetRunner } from "../src/types/TargetRunner";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { getStartTargetId, getTargetId, Target, TargetGraph } from "@lage-run/target-graph";

/**
 * Purely manually managed target graph. 
 * 1. It doesn't gaurantee that the targets' dependencies are the same as the graph's dependencies.
 * 2. It will auto create a startTargetId -> each target's id.
 */
class TestTargetGraph implements TargetGraph {
  targets: Map<string, Target> = new Map();
  dependencies: [string, string][] = [];

  addTarget(this: TargetGraph, packageName: string, task: string) {
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

describe("SimpleScheduler", () => {
  it.only("should run all targets, if no target dependencies exists in the target graph", async () => {
    const root = "/root-of-repo";
    const logger = new Logger();

    const cacheProvider: CacheProvider = {
      clear: jest.fn(),
      fetch: jest.fn(),
      put: jest.fn(),
      purge: jest.fn(),
    };

    const hasher = new TargetHasher({ root, environmentGlob: [] });

    const runner: TargetRunner = {
      abort() {},
      async run(_target) {
        return true;
      },
    };

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 1,
      cacheProvider,
      hasher,
      runner,
      continueOnError: false,
      shouldCache: true,
      shouldResetCache: false,
    });

    // these would normally come from the CLI
    const targetGraph = new TestTargetGraph().addTarget("a", "build").addTarget("b", "build");

    const targetRunContexts = await scheduler.run(root, targetGraph);

    expect(targetRunContexts.size).toBe(2);
    expect(targetRunContexts.get("a#test")!.status).toBe("success");
    expect(targetRunContexts.get("b#test")!.status).toBe("success");
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

    const runner: TargetRunner = {
      abort() {},
      async run(target) {
        if (target.packageName === "d" || target.packageName === "e") {
          return false;
        }

        return true;
      },
    };

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 1,
      cacheProvider,
      hasher,
      runner,
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

    await expect(() => scheduler.run(root, targetGraph)).toThrow();

    const targetRunContexts = scheduler.targetRunContexts;
    expect(targetRunContexts.size).toBe(5);
    expect(targetRunContexts.get("d#test")!.status).toBe("success");

    let failedCount = 0;
    for (const entry of targetRunContexts.values()) {
      failedCount = entry.status === "failed" ? failedCount + 1 : failedCount;
    }

    expect(failedCount).toBe(1);
  });
});
