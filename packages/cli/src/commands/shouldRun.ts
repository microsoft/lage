import type { Target, TargetConfig } from "@lage-run/target-graph";
import { TargetRunner, TargetRunnerPicker, TargetRunnerPickerOptions } from "@lage-run/runners";

// Generate a shouldRun function we can provide to the graph builder to prune tasks
// This allows the runners configured in the project to return whether the task should
// run.  If a task should not run, it also should not cause anything it depends on to
// run.
export function shouldRun(pickerOptions: TargetRunnerPickerOptions) {
  const picker = new TargetRunnerPicker(pickerOptions);
  return async (config: TargetConfig, target: Target) => {
    if (typeof config.shouldRun === "function" && !await config.shouldRun(target)) {
      return false;
    }

    const runner = await picker.pick(target);
    if(!runner?.shouldRun(target)) {
      return false;
    }

    return true;
  }
}
