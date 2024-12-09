import type { TargetRunnerPickerOptions } from "@lage-run/runners";

const scripts = {
  npmScript: require.resolve("./runners/NpmScriptRunner.js"),
  worker: require.resolve("./runners/WorkerRunner.js"),
  noop: require.resolve("./runners/NoOpRunner.js"),
};

export function runnerPickerOptions(nodeArg: string | undefined, npmCmd: string, taskArgs: string[]): TargetRunnerPickerOptions {
  return {
    npmScript: {
      script: scripts.npmScript,
      options: {
        nodeArg,
        taskArgs,
        npmCmd,
      },
    },
    worker: {
      script: scripts.worker,
      options: {
        taskArgs,
      },
    },
    noop: {
      script: scripts.noop,
      options: {},
    },
  };
}
