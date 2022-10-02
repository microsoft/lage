import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker";
import { workerData } from "worker_threads";
import type { AbortSignal } from "abort-controller";
import type { TargetRunnerPickerOptions } from "../runners/TargetRunnerPicker";

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
  await runner.run(data.target, abortSignal);
}

registerWorker(run);
