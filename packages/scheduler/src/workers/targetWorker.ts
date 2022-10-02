import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker, TargetRunnerPickerOptions } from "../runners/TargetRunnerPicker";
import { workerData } from "worker_threads";

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

async function run(data) {
  const runner = runnerPicker.pick(data.target);
  await runner.run(data.target);
}

registerWorker(run);
