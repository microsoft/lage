import type { TargetRunnerPickerOptions } from "@lage-run/runners";

let runnerScripts:
  | {
      npmScript: string;
      worker: string;
      noop: string;
    }
  | undefined;

const memoizedRunnerPickerOptions = new Map<string, TargetRunnerPickerOptions>();

function memoizationKey(nodeArg: string | undefined, npmCmd: string, taskArgs: string[]): string {
  return `${nodeArg ?? ""}##${npmCmd}##${taskArgs.join("-")}`;
}

function memoize(nodeArg: string | undefined, npmCmd: string, taskArgs: string[]): TargetRunnerPickerOptions {
  if (!runnerScripts) {
    runnerScripts = {
      npmScript: require.resolve("./runners/NpmScriptRunner.js"),
      worker: require.resolve("./runners/WorkerRunner.js"),
      noop: require.resolve("./runners/NoOpRunner.js"),
    };
  }

  const key = memoizationKey(nodeArg, npmCmd, taskArgs);

  if (!memoizedRunnerPickerOptions.has(key)) {
    memoizedRunnerPickerOptions.set(key, {
      npmScript: {
        script: runnerScripts.npmScript,
        options: {
          nodeArg,
          taskArgs,
          npmCmd,
        },
      },
      worker: {
        script: runnerScripts.worker,
        options: {
          taskArgs,
        },
      },
      noop: {
        script: runnerScripts.noop,
        options: {},
      },
    });
  }

  return memoizedRunnerPickerOptions.get(key)!;
}

export function runnerPickerOptions(nodeArg: string | undefined, npmCmd: string, taskArgs: string[]): TargetRunnerPickerOptions {
  return memoize(nodeArg, npmCmd, taskArgs);
}
