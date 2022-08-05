import { Logger } from "@lage-run/logger";
import { CacheProvider, TargetHasher } from "@lage-run/cache";
import { TargetRunner } from "../src/types/TargetRunner";
import { SimpleScheduler } from "../src/SimpleScheduler";
import { TargetGraph } from "@lage-run/target-graph";

describe("SimpleScheduler", () => {
  it("should run targets all in parallel if no target dependencies exists in the target graph", async() => {
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
      run() {
        return Promise.resolve(true);
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
    const targetGraph: TargetGraph = {
      targets: new Map([
        [
          "a#test",
          {
            id: "a#test",
            label: "a - test",
            packageName: "a",
            task: "build",
            cwd: "packages/a",
            dependencies: ["^test"],
          },
        ],
        [
          "b#test",
          {
            id: "b#test",
            packageName: "b",
            task: "test",
            label: "b - test",
            cwd: "packages/b",
            dependencies: [],
          },
        ],
      ]),
      dependencies: [["b#test", "a#test"]],
    };

    const targetRunInfo = await scheduler.run(root, targetGraph);

    expect(targetRunInfo.size).toBe(2);
    expect(targetRunInfo.get("a#test")!.status).toBe("success");
    expect(targetRunInfo.get("b#test")!.status).toBe("success");
  });
});
