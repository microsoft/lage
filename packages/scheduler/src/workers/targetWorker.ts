import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker.js";
import { workerData } from "worker_threads";
import type { TargetRunnerPickerOptions } from "@lage-run/scheduler-types";

interface TargetWorkerDataOptions {
  runners: TargetRunnerPickerOptions;
  root: string;
}

function setup(options: TargetWorkerDataOptions) {
  const { runners, root } = options;

  const runnerPicker = new TargetRunnerPicker(runners);

  return {
    runnerPicker,
  };
}

const { runnerPicker } = setup(workerData);

async function run(data: any, abortSignal?: AbortSignal) {
  const runner = await runnerPicker.pick(data.target);
  await runner.run({
    ...data,
    abortSignal,
  });
}

registerWorker(run);
