import type { Command } from "commander";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { type ConfigOptions, getConfig } from "@lage-run/config";
import { getWorkspaceRoot, getPackageInfos } from "workspace-tools";
import createLogger from "@lage-run/logger";
import path from "path";
import fs from "fs";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { TargetFactory } from "@lage-run/target-graph";
import { initializeReporters } from "../initializeReporters.js";
import { TargetRunnerPicker, type TargetRunnerPickerOptions } from "@lage-run/runners";
import { getPackageAndTask } from "@lage-run/target-graph/lib/targetId.js";

interface ExecOptions extends ReporterInitOptions {
  cwd?: string;
  nodeArg?: string[];
}

/**
 * Parses the package and task from the command as quickly as possible:
 *
 * 1. if cwd overridden in args, use it to read the package.json directly
 * 2. if cwd not overridden and root is not cwd, use the cwd to read the package.json directly
 * 3. if root is cwd, assume the task is global
 *
 * @param options
 * @param command
 * @returns
 */
function parsePackageInfoFromArgs(root: string, options: ExecOptions, command: Command) {
  const { packageName, task } = getPackageAndTask(command.args[0]);

  if (packageName) {
    const packageInfos = getPackageInfos(root);
    const info = packageInfos[packageName];
    return {
      info,
      task,
      isGlobal: false,
    };
  }

  if (options.cwd) {
    const packageJsonPath = path.join(options.cwd, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    return {
      info: {
        ...packageJson,
        packageJsonPath,
      },
      task,
      isGlobal: false,
    };
  }

  if (root !== process.cwd()) {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      return {
        info: {
          ...packageJson,
          packageJsonPath,
        },
        task,
        isGlobal: false,
      };
    }
  }

  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  return {
    info: {
      ...packageJson,
      packageJsonPath,
    },
    task,
    isGlobal: true,
  };
}

function expandTargetDefinition(packageName: string | undefined, task: string, pipeline: ConfigOptions["pipeline"], outputs: string[]) {
  const id = packageName ? `${packageName}#${task}` : task;
  const emptyDefinition = {
    cache: false,
    dependsOn: [],
    options: {},
    outputs,
  };
  const definition =
    id in pipeline
      ? pipeline[id]
      : `#${task}` in pipeline
      ? pipeline[`#${task}`]
      : `//${task}` in pipeline
      ? pipeline[`//${task}`]
      : task in pipeline
      ? pipeline[task]
      : emptyDefinition;

  if (Array.isArray(definition)) {
    return emptyDefinition;
  } else {
    return definition;
  }
}

export async function execAction(options: ExecOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const { pipeline } = config;

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const root = getWorkspaceRoot(cwd)!;

  const { info, task, isGlobal } = parsePackageInfoFromArgs(root, options, command);
  const packageInfos = { [info.name]: info };

  const resolve = () => {
    return path.dirname(info.packageJsonPath).replace(/\\/g, "/");
  };

  const { taskArgs } = filterArgsForTasks(command.args);

  const factory = new TargetFactory({ root, resolve, packageInfos });

  const definition = expandTargetDefinition(isGlobal ? undefined : info.name, task, pipeline, config.cacheOptions.outputGlob ?? []);

  const target = isGlobal ? factory.createGlobalTarget(task, definition) : factory.createPackageTarget(info.name, task, definition);
  const pickerOptions: TargetRunnerPickerOptions = {
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
    logger.info("Running target", { target });
    await runner.run({
      target,
      weight: 1,
      abortSignal: new AbortController().signal,
    });
    logger.info("Finished", { target });
  }
}
