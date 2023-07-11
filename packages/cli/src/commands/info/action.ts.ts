import type { Command } from "commander";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { getConfig } from "@lage-run/config";
import { getPackageInfosAsync, getWorkspaceRoot } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import createLogger from "@lage-run/logger";
import path from "path";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { getStartTargetId } from "@lage-run/target-graph";

interface RunOptions extends ReporterInitOptions {
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  to: string[];
  cache: boolean;
  nodeArg: string;
  ignore: string[];
}

interface PackageTask {
  id: string;
  command: string[];
  dependencies: string[];
  workingDirectory: string;
  package: string;
  task: string;
}

interface Output {
  msg: string;
  data: {
    command: string[];
    scope: string[];
    packageTasks: PackageTask[];
  };
}

interface PackageTasksByPackage {
  [packageName: string]: PackageTask[];
}

export async function infoAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();

  const { config, logger, root } = await getConfigAndLogger(cwd);

  const packageInfos = await getPackageInfosAsync(root);

  const targetGraph = prepareAndCreateTargetGraph(config, logger, root, options, packageInfos, command);

  const scope = prepareAndGetFilteredPackages(config, logger, root, options, packageInfos);

  let output = initialOutputGenerator(command, scope);

  output = processTargets(targetGraph.targets, packageInfos, config, output);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

async function getConfigAndLogger(cwd) {
  const config = await getConfig(cwd);
  const logger = createLogger();
  const root = getWorkspaceRoot(cwd)!;
  return { config, logger, root };
}

function prepareAndCreateTargetGraph(config, logger, root, options, packageInfos, command) {
  const { tasks } = filterArgsForTasks(command.args);
  const targetGraph = createTargetGraph({
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
  });

  return targetGraph;
}

function prepareAndGetFilteredPackages(config, logger, root, options, packageInfos) {
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

  return scope;
}

function initialOutputGenerator(command, scope) {
  const output: Output = {
    msg: "info",
    data: {
      command: command.args,
      scope: scope,
      packageTasks: [],
    },
  };
  return output;
}

function processTargets(targets, packageInfos, config, output) {
  const packageTasksByPackage: PackageTasksByPackage = {};

  for (const target of targets.values()) {
    if (shouldSkipTarget(target, packageInfos)) {
      continue;
    }

    const startIdIndex = target.dependencies.indexOf(getStartTargetId());
    target.dependencies.splice(startIdIndex, 1);

    const packageTask = generatePackageTask(target, config);
    packageTasksByPackage[packageTask.package] = packageTasksByPackage[packageTask.package] || [];
    packageTasksByPackage[packageTask.package].push(packageTask);
  }

  appendPackageTasksToOutput(packageTasksByPackage, output);

  return output;
}

function shouldSkipTarget(target, packageInfos) {
  return target.id === getStartTargetId() || !packageInfos[target.packageName ?? ""]?.scripts?.[target.task];
}

function appendPackageTasksToOutput(packageTasksByPackage: PackageTasksByPackage, output: Output) {
  for (const [, packageTasks] of Object.entries(packageTasksByPackage)) {
    output.data.packageTasks.push(...packageTasks);
  }
}

function generatePackageTask(target, config): PackageTask {
  const command = generateCommand(target, config);
  const workingDirectory = getWorkingDirectory(target);

  const packageTask: PackageTask = {
    id: target.id,
    command,
    dependencies: target.dependencies,
    workingDirectory,
    package: target.packageName,
    task: target.task,
  };

  return packageTask;
}

function generateCommand(target, config) {
  const npmClient = config.npmClient ?? "npm";

  const command = [npmClient, ...getNpmArgs(target.task, target.taskArgs)];
  return command;
}

function getWorkingDirectory(target) {
  const cwd = process.cwd();
  const workingDirectory = path.relative(getWorkspaceRoot(cwd) ?? "", target.cwd);
  return workingDirectory;
}

function getNpmArgs(task: string, taskTargs: string[]) {
  const extraArgs = taskTargs != undefined && taskTargs.length > 0 ? ["--", ...taskTargs] : [];
  return ["run", task, ...extraArgs];
}
