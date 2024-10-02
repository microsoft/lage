import type { Command } from "commander";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import type { ConfigOptions } from "@lage-run/config";
import { getConfig } from "@lage-run/config";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import createLogger from "@lage-run/logger";
import { removeNodes, transitiveReduction } from "@lage-run/target-graph";
import path from "path";
import fs from "fs";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { TargetGraph, Target } from "@lage-run/target-graph";
import { initializeReporters } from "../initializeReporters.js";
import { TargetRunnerPicker, type TargetRunnerPickerOptions } from "@lage-run/runners";

interface InfoActionOptions extends ReporterInitOptions {
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
export async function infoAction(options: InfoActionOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  options.server = typeof options.server === "string" ? options.server : "localhost:5332";
  initializeReporters(logger, options);
  const root = getWorkspaceRoot(cwd)!;

  const packageInfos = getPackageInfos(root);

  const { tasks, taskArgs } = filterArgsForTasks(command.args);

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

  const pickerOptions: TargetRunnerPickerOptions = {
    npmScript: {
      script: require.resolve("./runners/NpmScriptRunner.js"),
      options: {
        nodeArg: options.nodeArg,
        taskArgs,
        npmCmd: config.npmClient,
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

  const runnerPicker = new TargetRunnerPicker(pickerOptions);

  const optimizedTargets = await optimizeTargetGraph(targetGraph, runnerPicker);
  const binPaths = getBinPaths();
  const packageTasks = optimizedTargets.map((target) => generatePackageTask(target, taskArgs, config, options, binPaths));

  logger.info("info", {
    command: command.args,
    scope,
    packageTasks,
  });
}

function getBinPaths() {
  let dir = __dirname;
  let packageJsonPath = "";
  while (dir !== "/") {
    packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      break;
    }
    dir = path.dirname(dir);
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  return { lage: path.join(dir, packageJson.bin.lage), "lage-server": path.join(dir, packageJson.bin["lage-server"]) };
}

async function optimizeTargetGraph(graph: TargetGraph, runnerPicker: TargetRunnerPicker) {
  const targetMinimizedNodes = await removeNodes([...graph.targets.values()] ?? [], async (target) => {
    if (target.type === "noop") {
      return true;
    }

    const runner = await runnerPicker.pick(target);
    if (!(await runner.shouldRun(target))) {
      return true;
    }

    return false;
  });

  return transitiveReduction(targetMinimizedNodes);
}

function generatePackageTask(
  target: Target,
  taskArgs: string[],
  config: ConfigOptions,
  options: InfoActionOptions,
  binPaths: { lage: string; "lage-server": string }
): PackageTask {
  const command = generateCommand(target, taskArgs, config, options, binPaths);
  const workingDirectory = getWorkingDirectory(target);

  const packageTask: PackageTask = {
    id: target.id,
    command,
    dependencies: target.dependencies,
    workingDirectory,
    package: target.packageName ?? "",
    task: target.task,
  };

  return packageTask;
}

function generateCommand(
  target: Target,
  taskArgs: string[],
  config: ConfigOptions,
  options: InfoActionOptions,
  binPaths: { lage: string; "lage-server": string }
) {
  if (target.type === "npmScript") {
    const npmClient = config.npmClient ?? "npm";
    const command = [npmClient, ...getNpmArgs(target.task, taskArgs)];
    return command;
  } else if (target.type === "worker" && options.server) {
    const [host, port] = options.server.split(":");
    const command = [process.execPath, binPaths["lage-server"]];

    if (host) {
      command.push("--host", host);
    }

    if (port) {
      command.push("--port", port);
    }

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
    const command = [process.execPath, binPaths.lage, "exec"];
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
