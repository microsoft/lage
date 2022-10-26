import { Logger, Reporter } from "@lage-run/logger";
import { Target, TargetConfig } from "@lage-run/target-graph";
import path from "path";
import { WorkerRunner } from "../src/runners/WorkerRunner";

describe("WorkerRunner", () => {
  it("can create a pool to run worker targets in parallel with worker_thread", async () => {
    const workerFixture = path.join(__dirname, "./fixtures/worker.js");
    const runner = new WorkerRunner();

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
      options: {
        worker: workerFixture,
      },
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
      options: {
        worker: workerFixture,
      },
    } as Target;

    await Promise.all([runner.run({ target: target1, weight: 1 }), runner.run({ target: target2, weight: 1 })]);
  });
});
