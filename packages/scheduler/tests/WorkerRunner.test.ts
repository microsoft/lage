import { Logger } from "@lage-run/logger";
import { Target } from "@lage-run/target-graph";
import path from "path";
import { WorkerRunner } from "../src/runners/WorkerRunner";

describe("WorkerRunner", () => {
  it("can create a pool to run worker targets in parallel with worker_thread", async () => {
    const workerFixture = path.join(__dirname, "./fixtures/worker.js");
    const logger = new Logger();
    const runner = new WorkerRunner({
      logger,
      workerScripts: {
        work: workerFixture,
      },
      poolOptions: {
        work: {
          maxWorkers: 2,
        },
      },
    });

    const target = {
      id: "a#work",
      task: "work",
      packageName: "a",
      cwd: "/repo/dummy/cwd",
      dependencies: [],
      label: "a - work",
      type: "worker"
    } as Target;

    await runner.run(target);

    await runner.cleanup();
  });
});
