import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "@lage-run/runners";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import type { Target } from "@lage-run/target-graph";
import { workerData } from "worker_threads";

interface SimpleTargetWorkerDataOptions {
  runners: TargetRunnerPickerOptions;
}

async function setup(options: SimpleTargetWorkerDataOptions) {
  const { runners } = options;
  const runnerPicker = new TargetRunnerPicker(runners);

  return {
    options,
    runnerPicker,
  };
}

void (async () => {
  const { runnerPicker } = await setup(workerData);
  async function run(data: { target: Target }, abortSignal?: AbortSignal) {
    let value: unknown = undefined;
    const runner = await runnerPicker.pick(data.target);

    value = await runner.run({
      target: data.target,
      weight: 0,
      abortSignal,
    });

    return {
      skipped: false,
      hash: undefined,
      value,
    };
  }

  registerWorker(run);
})();
