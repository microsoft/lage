import type { TargetRunnerPickerOptions } from "@lage-run/runners";

export function runnerPickerOptions(nodeArg: string | undefined, npmCmd: string, taskArgs: string[]): TargetRunnerPickerOptions {
  return {
    npmScript: {
      script: require.resolve("./runners/NpmScriptRunner.js"),
      options: {
        nodeArg,
        taskArgs,
        npmCmd,
      },
    },
    worker: {
      script: require.resolve("./runners/WorkerRunner.js"),
      options: {
        taskArgs,
      },
    },
    noop: {
      script: require.resolve("./runners/NoOpRunner.js"),
      options: {},
    },
  };
}
