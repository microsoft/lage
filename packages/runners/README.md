# @lage-run/runners

This package provides:

1. `TargetRunner` & `TargetRunOptions` interfaces
2. Runner implementations
   - `NpmScriptRunner` (`Target.type: "npmScript"`)
   - `WorkerRunner` (`Target.type: "worker"`)
   - `NoOpRunner` (`Target.type: "noop"`)
3. `TargetRunnerPicker` to choose the runner for a `Target`
