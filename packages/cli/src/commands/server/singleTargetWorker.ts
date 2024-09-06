import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "@lage-run/runners";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import type { Target } from "@lage-run/target-graph";

(async () => {
  async function run(data: { target: Target; runners: TargetRunnerPickerOptions }, abortSignal?: AbortSignal) {
    let value: unknown = undefined;

    const runnerPicker = new TargetRunnerPicker(data.runners);

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
