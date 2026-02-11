import type { NpmScriptRunnerOptions, TargetRunnerPickerOptions, WorkerRunnerOptions } from "@lage-run/runners";

export function getBuiltInRunners(params: { nodeArg: string | undefined; npmCmd: string; taskArgs: string[] }): TargetRunnerPickerOptions {
  const { nodeArg, npmCmd, taskArgs } = params;
  return {
    npmScript: {
      script: require.resolve("./runners/NpmScriptRunner.js"),
      options: {
        nodeOptions: nodeArg,
        taskArgs,
        npmCmd,
      } satisfies NpmScriptRunnerOptions,
    },
    worker: {
      script: require.resolve("./runners/WorkerRunner.js"),
      options: {
        taskArgs,
      } satisfies WorkerRunnerOptions,
    },
    noop: {
      script: require.resolve("./runners/NoOpRunner.js"),
      options: {},
    },
  };
}
