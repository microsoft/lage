import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker.js";
import { workerData } from "worker_threads";
import type { AbortSignal } from "abort-controller";
import type { TargetRunnerPickerOptions } from "../runners/TargetRunnerPicker.js";

interface TargetWorkerDataOptions {
  runners: TargetRunnerPickerOptions;
}

function setup(options: TargetWorkerDataOptions) {
  const { runners } = options;

  const runnerPicker = new TargetRunnerPicker(runners);

  return {
    runnerPicker,
  };
}

const { runnerPicker } = setup(workerData);

async function run(data: any, abortSignal?: AbortSignal) {
  const runner = runnerPicker.pick(data.target);
  await runner.run({
    ...data,
    abortSignal,
  });
}

registerWorker(run);
