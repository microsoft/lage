import { Logger } from "@lage-run/logger";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { TargetRunner } from "../src/types/TargetRunner";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { getStartTargetId, Target, TargetGraph } from "@lage-run/target-graph";
import { NoOpRunner } from "../src/runners/NoOpRunner";

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

    expect(targetRunContexts).toMatchInlineSnapshot(`
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

  it.only("should abort early throwing an error, if one target fails without continue on error", async () => {
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
      async run(target) {
        if (target.packageName === "d" || target.packageName === "e") {
          throw new Error(`failing! ${target.packageName}#${target.task}`);
        }
      },
    };

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: 4,
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

    await scheduler.run(root, targetGraph);

    const targetRunContexts = scheduler.targetRunContexts;
    expect(targetRunContexts.size).toBe(6);
    expect(targetRunContexts.get("d#build")!.status).not.toBe("success");
  });
});
