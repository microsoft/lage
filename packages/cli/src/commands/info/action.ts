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
import { initializeReporters } from "../initializeReporters.js";

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

/**
 * (UNSTABLE) The info command displays information about a target graph in a workspace.
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
 *       ]
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
export async function infoAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);
  const root = getWorkspaceRoot(cwd)!;

  const packageInfos = await getPackageInfosAsync(root);
  const targetGraph = prepareAndCreateTargetGraph(config, logger, root, options, packageInfos, command);
  const scope = prepareAndGetFilteredPackages(config, logger, root, options, packageInfos);
  const packageTasks = processTargets(targetGraph.targets, packageInfos, config);

  logger.info("info", {
    command: command.args,
    scope,
    packageTasks: [...packageTasks.values()].flat(),
  });
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

function processTargets(targets, packageInfos, config) {
  const packageTasks = new Map<string, PackageTask[]>(); // Initialize the map with the correct type
  const dependenciesCache = new Map<string, string[]>();

  for (const target of targets.values()) {
    if (shouldSkipTarget(target, packageInfos)) {
      continue;
    }

    const packageTask = generatePackageTask(target, targets, packageInfos, dependenciesCache, config);
    if (packageTask) {
      // Check if the packageTask is defined before accessing its properties
      const packageName = packageTask.package;
      if (!packageTasks.has(packageName)) {
        packageTasks.set(packageName, []);
      }
      packageTasks.get(packageName)!.push(packageTask); // Use the non-null assertion operator to avoid type errors
    }
  }

  return packageTasks;
}

function isTargetNoop(target, packageInfos) {
  return !packageInfos[target.packageName]?.scripts?.[target.task];
}

function shouldSkipTarget(target, packageInfos) {
  return target.id === getStartTargetId() || isTargetNoop(target, packageInfos);
}

function generatePackageTask(target, targets, packageInfos, dependenciesCache, config): PackageTask {
  const command = generateCommand(target, config);
  const workingDirectory = getWorkingDirectory(target);

  const dependenciesSet = resolveDependencies(target.dependencies, targets, packageInfos, dependenciesCache);

  const packageTask: PackageTask = {
    id: target.id,
    command,
    dependencies: [...dependenciesSet],
    workingDirectory,
    package: target.packageName,
    task: target.task,
  };

  return packageTask;
}

function resolveDependencies(dependencies: string[], targets, packageInfos, dependenciesCache: Map<string, Set<string>>) {
  const result: Set<string> = new Set();

  for (const dependency of dependencies) {
    if (dependency === getStartTargetId()) {
      continue;
    }

    if (!dependenciesCache.has(dependency)) {
      const dependencyTarget = targets.get(dependency);
      if (isTargetNoop(dependencyTarget, packageInfos)) {
        dependenciesCache.set(dependency, resolveDependencies(dependencyTarget.dependencies, targets, packageInfos, dependenciesCache));
      } else {
        dependenciesCache.set(dependency, new Set([dependency]));
      }
    }

    dependenciesCache.get(dependency)?.forEach((dependency: string) => result.add(dependency));
  }

  return result;
}

function generateCommand(target, config) {
  const npmClient = config.npmClient ?? "npm";

  const command = [npmClient, ...getNpmArgs(target.task, target.taskArgs)];
  return command;
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
