import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { Logger } from "@lage-run/logger";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { InProcPool } from "./fixtures/pools";
import { getTargetId, Target, TargetGraphBuilder } from "@lage-run/target-graph";
import { TargetRunner } from "@lage-run/scheduler-types";

function createTarget(packageName: string, task: string): Target {
  const id = getTargetId(packageName, task);
  return {
    id,
    label: `${packageName} - ${task}`,
    packageName,
    task,
    cwd: `packages/${packageName}`,
    dependencies: [],
    dependents: [],
    depSpecs: [],
  };
}

describe("SimpleScheduler watch mode", () => {
  it("should not execute the target runner twice by default", async () => {
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
      run: jest.fn(),
    };

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
      pool: new InProcPool(runner),
      workerIdleMemoryLimit: 1024 * 1024 * 1024,
    });

    // these would normally come from the CLI
    const builder = new TargetGraphBuilder();

    builder.addTarget(createTarget("a", "build"));

    const graph = builder.build();

    await scheduler.run(root, graph);
    await scheduler.run(root, graph);

    await scheduler.cleanup();

    expect(runner.run).toHaveBeenCalledTimes(1);
  });

  it("should re-run all the targets if a target said to re-run is a root node", async () => {
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
      run: jest.fn(),
    };

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
      pool: new InProcPool(runner),
      workerIdleMemoryLimit: 1024 * 1024 * 1024,
    });

    // these would normally come from the CLI
    const builder = new TargetGraphBuilder();

    const targetA = createTarget("a", "build");

    builder.addTarget(targetA);
    builder.addTarget(createTarget("b", "build"));
    builder.addTarget(createTarget("c", "build"));

    builder.addDependency("a#build", "b#build");
    builder.addDependency("b#build", "c#build");

    const graph = builder.build();

    await scheduler.run(root, graph);

    const newGraph = {
      targets: new Map([["a#build", targetA]]),
    };

    await scheduler.run(root, newGraph, true);

    await scheduler.cleanup();

    // There are 3 targets defined
    expect(runner.run).toHaveBeenCalledTimes(6);
  });
});
