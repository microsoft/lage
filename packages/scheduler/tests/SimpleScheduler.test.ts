import { Logger } from "@lage-run/logger";
import { RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { TargetRunner } from "../src/types/TargetRunner";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { TargetGraph, TargetGraphBuilder } from "@lage-run/target-graph";

describe("SimpleScheduler", () => {
  it("should run targets all in parallel if no target dependencies exists in the target graph", () => {
    const root = "/root-of-repo";
    const logger = new Logger();
    const cacheProvider = new RemoteFallbackCacheProvider({ root, logger, ... });
    const hasher = new TargetHasher({ root, ... });

    const runner: TargetRunner = {
      abort() {
      },
      run() {
        return Promise.resolve(true);
      }
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
    const tasks = ["build", "test"];
    const packages = ["package-a", "package-b"];

    const targetGraph: TargetGraph = {
      targets: new Map([
        ["a#test", { 
          id: "a#test", 
          label: "a - test",
          packageName: "a", 
          task: "build", 
          cwd: 'packages/a',
          dependencies: []
        }], 
        ["b#test", { 
          id: "b#test", 
          packageName: "b", 
          task: "test",
          label: "b - test",
          cwd: 'packages/b',
          dependencies: []
        }]
      ]),
      dependencies: [["a#test", "b#test"]],
    };

    const targetRunInfo = await scheduler.run(root, targetGraph);

    expect(targetRunInfo.size).toBe(2);
  });
});
