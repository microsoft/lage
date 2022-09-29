import { Logger, Reporter } from "@lage-run/logger";
import { Target, TargetConfig } from "@lage-run/target-graph";
import path from "path";
import { WorkerRunner } from "../src/runners/WorkerRunner";

describe("WorkerRunner", () => {
  it("can create a pool to run worker targets in parallel with worker_thread", async () => {
    const workerFixture = path.join(__dirname, "./fixtures/worker.js");
    const logger = new Logger();

    const dummyReporter = {
      log(entry) {
        console.log(entry);
      },
    } as Reporter;

    logger.addReporter(dummyReporter);

    const runner = new WorkerRunner({
      logger,
    });

    const target1 = {
      id: "a#work",
      task: "work",
      packageName: "a",
      cwd: "/repo/dummy/cwd",
      dependencies: [],
      dependents: [],
      depSpecs: [],
      label: "a - work",
      type: "worker",
    } as Target;

    const target2 = {
      id: "b#work",
      task: "work",
      packageName: "b",
      cwd: "/repo/dummy/cwd",
      dependencies: [],
      dependents: [],
      depSpecs: [],
      label: "b - work",
      type: "worker",
    } as Target;

    await Promise.all([runner.run(target1), runner.run(target2)]);
    await runner.cleanup();
  });
});
