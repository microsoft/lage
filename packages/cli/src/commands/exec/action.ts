import type { Command } from "commander";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { getConfig } from "@lage-run/config";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import createLogger from "@lage-run/logger";
import path from "path";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { TargetFactory } from "@lage-run/target-graph";
import { initializeReporters } from "../initializeReporters.js";
import { TargetRunnerPicker } from "@lage-run/runners";
import { getPackageAndTask } from "@lage-run/target-graph/lib/targetId.js";

interface ExecOptions extends ReporterInitOptions {
  cwd?: string;
  nodeArg?: string[];
}

export async function execAction(options: ExecOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const root = getWorkspaceRoot(cwd)!;

  const packageInfos = getPackageInfos(root);

  const resolve = (packageName: string) => {
    return path.relative(root, path.dirname(packageInfos[packageName]?.packageJsonPath)).replace(/\\/g, "/");
  };

  const { taskArgs } = filterArgsForTasks(command.args);

  const { packageName, task } = getPackageAndTask(command.args[0]);

  const factory = new TargetFactory({ root, resolve, packageInfos });

  const target = packageName ? factory.createPackageTarget(packageName, task, {}) : factory.createGlobalTarget(task, {});

  const pickerOptions = {
    npmScript: {
      script: require.resolve("../run/runners/NpmScriptRunner.js"),
      options: {
        nodeArg: options.nodeArg,
        taskArgs,
        npmCmd: config.npmClient,
      },
    },
    worker: {
      script: require.resolve("../run/runners/WorkerRunner.js"),
      options: {
        taskArgs,
      },
    },
    noop: {
      script: require.resolve("../run/runners/NoOpRunner.js"),
      options: {},
    },
  };
  const runnerPicker = new TargetRunnerPicker(pickerOptions);
  const runner = await runnerPicker.pick(target);
  if (await runner.shouldRun(target)) {
    await runner.run({
      target,
      weight: 1,
      abortSignal: new AbortController().signal,
    });
  }
}
