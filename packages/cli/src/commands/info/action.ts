import type { Command } from "commander";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import type { ConfigOptions } from "@lage-run/config";
import { getConfig } from "@lage-run/config";
import { type PackageInfos, getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import createLogger from "@lage-run/logger";
import path from "path";
import { parse } from "shell-quote";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { Target } from "@lage-run/target-graph";
import { initializeReporters } from "../initializeReporters.js";
import { TargetRunnerPicker } from "@lage-run/runners";
import { getBinPaths } from "../../getBinPaths.js";
import { runnerPickerOptions } from "../../runnerPickerOptions.js";
import { parseServerOption } from "../parseServerOption.js";
import { optimizeTargetGraph } from "../../optimizeTargetGraph.js";

export interface InfoActionOptions extends ReporterInitOptions {
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  to: string[];
  cache: boolean;
  nodeArg: string;
  ignore: string[];
  server: string;
}

interface PackageTask {
  id: string;
  command: string[];
  dependencies: string[];
  workingDirectory: string;
  package: string;
  task: string;
  inputs?: string[];
  outputs?: string[];
  options?: Record<string, any>;
  weight?: number;
}

/**
 * The info command displays information about a target graph in a workspace.
 * The generated output can be read and used by other task runners, such as BuildXL.
 *
 * Expected format:
 * [
 *   {
 *       "id": "bar##build",
 *       "package": "bar",
 *       "task": "build",
 *       "command": "npm run build --blah",
 *       "workingDirectory": "packages/bar",
 *       "dependencies": []
 *   },
 *   {
 *       "id": "foo##build",
 *       "package": "foo",
 *       "task": "build",
 *       "command": "npm run build --blah",
 *       "workingDirectory": "packages/foo",
 *       "dependencies": [
 *           "bar##build"
 *       ],
 *       "weight": 3,
 *       "inputs": ["src//**/ /*.ts"],
 *       "inputs": ["lib//**/ /*.js", "lib//**/ /*.d.ts]"
 *   },
 *   {
 *       "id": "foo##test",
 *       "package": "foo",
 *       "task": "test",
 *       "command": "npm run test --blah",
 *       "workingDirectory": "packages/foo",
 *       "dependencies": [
 *           "foo##build"
 *       ]
 *   },
 *   ...
 * ]
 */
export async function infoAction(options: InfoActionOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  options.server = typeof options.server === "boolean" && options.server ? "localhost:5332" : options.server;
  initializeReporters(logger, options);
  const root = getWorkspaceRoot(cwd)!;

  const packageInfos = getPackageInfos(root);

  const { tasks, taskArgs } = filterArgsForTasks(command.args);

  const targetGraph = await createTargetGraph({
    logger,
    root,
    dependencies: options.dependencies,
    dependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
    ignore: options.ignore.concat(config.ignore),
    pipeline: config.pipeline,
    repoWideChanges: config.repoWideChanges,
    scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
    since: options.since,
    outputs: config.cacheOptions.outputGlob,
    tasks,
    packageInfos,
    enableTargetConfigMerging: config.enableTargetConfigMerging,
  });

  const scope = getFilteredPackages({
    root,
    packageInfos,
    logger,
    includeDependencies: options.dependencies,
    includeDependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
    since: options.since,
    scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
    repoWideChanges: config.repoWideChanges,
    sinceIgnoreGlobs: options.ignore.concat(config.ignore),
  });

  const pickerOptions = runnerPickerOptions(options.nodeArg, config.npmClient, taskArgs);

  const runnerPicker = new TargetRunnerPicker(pickerOptions);

  const optimizedTargets = await optimizeTargetGraph(targetGraph, runnerPicker);
  const binPaths = getBinPaths();
  const packageTasks = optimizedTargets.map((target) =>
    generatePackageTask(target, taskArgs, config, options, binPaths, packageInfos, tasks)
  );

  logger.info("info", {
    command: command.args,
    scope,
    packageTasks,
  });
}

export function generatePackageTask(
  target: Target,
  taskArgs: string[],
  config: ConfigOptions,
  options: InfoActionOptions,
  binPaths: { lage: string; "lage-server": string },
  packageInfos: PackageInfos,
  tasks: string[]
): PackageTask {
  const command = generateCommand(target, taskArgs, config, options, binPaths, packageInfos, tasks);
  const workingDirectory = getWorkingDirectory(target);

  const packageTask: PackageTask = {
    id: target.id,
    command,
    dependencies: target.dependencies,
    workingDirectory,
    package: target.packageName ?? "",
    task: target.task,
    inputs: target.inputs,
    outputs: target.outputs,
    options: target.options,
    weight: target.weight,
  };

  return packageTask;
}

function generateCommand(
  target: Target,
  taskArgs: string[],
  config: ConfigOptions,
  options: InfoActionOptions,
  binPaths: { lage: string; "lage-server": string },
  packageInfos: PackageInfos,
  tasks: string[]
) {
  const shouldRunWorkersAsService =
    (typeof process.env.LAGE_WORKER_SERVER === "string" && process.env.LAGE_WORKER_SERVER !== "false") || !!options.server;

  if (target.type === "npmScript") {
    const script = target.packageName !== undefined ? packageInfos[target.packageName]?.scripts?.[target.task] : undefined;

    // If the script is a node script, and that it does not have any shell operators (&&, ||, etc)
    // then we can simply pass this along to info command rather than using npm client to run it.
    if (script && script.startsWith("node")) {
      const parsed = parse(script);
      if (parsed.length > 0 && parsed.every((entry) => typeof entry === "string")) {
        return [...(parsed as string[]), ...taskArgs];
      }
    }

    const npmClient = config.npmClient ?? "npm";
    const command = [npmClient, ...getNpmArgs(target.task, taskArgs)];
    return command;
  } else if (target.type === "worker" && shouldRunWorkersAsService) {
    const { host, port } = parseServerOption(options.server);
    const command = [binPaths["lage"], "exec", "--tasks", ...tasks, "--server", `${host}:${port}`];
    if (options.concurrency) {
      command.push("--concurrency", options.concurrency.toString());
    }

    if (target.packageName) {
      command.push(target.packageName);
    }

    if (target.task) {
      command.push(target.task);
    }

    command.push(...taskArgs);
    return command;
  } else if (target.type === "worker") {
    const command = [binPaths.lage, "exec"];
    command.push(target.packageName ?? "");
    command.push(target.task);
    command.push(...taskArgs);
    return command;
  }

  return [];
}

function getWorkingDirectory(target) {
  const cwd = process.cwd();
  const workingDirectory = path.relative(getWorkspaceRoot(cwd) ?? "", target.cwd).replace(/\\/g, "/");
  return workingDirectory;
}

function getNpmArgs(task: string, taskTargs: string[]) {
  const extraArgs = taskTargs != undefined && taskTargs.length > 0 ? ["--", ...taskTargs] : [];
  return ["run", task, ...extraArgs];
}
