import type { Command } from "commander";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import type { ConfigOptions } from "@lage-run/config";
import { getConfig } from "@lage-run/config";
import { type PackageInfos, getPackageInfos, getWorkspaceManagerRoot } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import createLogger from "@lage-run/logger";
import path from "path";
import fs from "fs";
import { parse } from "shell-quote";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { type Target, getStartTargetId } from "@lage-run/target-graph";
import { initializeReporters } from "../initializeReporters.js";
import { TargetRunnerPicker } from "@lage-run/runners";
import { getBinPaths } from "../../getBinPaths.js";
import { runnerPickerOptions } from "../../runnerPickerOptions.js";
import { parseServerOption } from "../parseServerOption.js";
import { optimizeTargetGraph } from "../../optimizeTargetGraph.js";
import { glob } from "@lage-run/globby";
import { FileHasher, hashStrings } from "@lage-run/hasher";
import { getGlobalInputHashFilePath } from "../targetHashFilePath.js";

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
  outputFile?: string;
  optimizeGraph: boolean;
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
 *       "options": {
 *         "environment": {
 *           "custom_env_var": "x",
 *          }
 *       }
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
export async function infoAction(options: InfoActionOptions, command: Command): Promise<void> {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  options.server = typeof options.server === "boolean" && options.server ? "localhost:5332" : options.server;
  await initializeReporters(logger, options, config.reporters);
  const root = getWorkspaceManagerRoot(cwd)!;

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
    priorities: config.priorities,
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

  // This is a temporary flag to allow backwards compatibility with the old lage graph format used by BuildXL (formerly known as Domino).
  // I initially worked on a commandline flag, but threading that through requires 3 different releases (lage, buildxl, ohome).
  // This is a temp solution to be able to upgrade to Lage V2 without breaking the BuildXL integration. And allow us
  // to update to lage v2.
  // Unfortunately this is the only variable that we can use to not break any other customers
  const createBackwardsCompatGraph = process.env["DOMINO"] === "1" || !options.optimizeGraph;

  const optimizedTargets = await optimizeTargetGraph(targetGraph, runnerPicker, createBackwardsCompatGraph);
  const binPaths = getBinPaths();
  const packageTasks = optimizedTargets.map((target) =>
    generatePackageTask(target, taskArgs, config, options, binPaths, packageInfos, tasks)
  );

  // In worker server mode, we need to actually speed up the BuildXL runs with presupplied global input hashes so that it doesn't try to read it over and over again
  // This is an important optimization for BuildXL for large amount of env glob matches in non-well-behaved monorepos
  // (e.g. repos that have files listed in env glob to avoid circular dependencies in package graph)
  if (shouldRunWorkersAsService(options)) {
    // For each target in the target graph, we need to create a global input hash file in this kind of location:
    // ${target.cwd}/.lage/global_inputs_hash
    // We will use glob for these files and use the FileHasher to generate these hashes.
    const fileHasher = new FileHasher({
      root,
    });

    const globHashCache = new Map<string, string>();
    const globHashWithCache = (patterns: string[], options: { cwd: string }) => {
      const key = patterns.join("###");
      if (globHashCache.has(key)) {
        return globHashCache.get(key)!;
      }

      const files = glob(patterns, options);
      const hash = hashStrings(Object.values(fileHasher.hash(files.map((file) => path.join(root, file)))));

      globHashCache.set(key, hash);

      return hash;
    };

    const globalInputs = config.cacheOptions?.environmentGlob
      ? glob(config.cacheOptions?.environmentGlob, { cwd: root })
      : ["lage.config.js"];

    for (const target of optimizedTargets) {
      if (target.id === getStartTargetId()) {
        continue;
      }

      const targetGlobalInputsHash = target.environmentGlob
        ? globHashWithCache(target.environmentGlob, { cwd: root })
        : globHashWithCache(globalInputs, { cwd: root });

      const targetGlobalInputsHashFile = path.join(target.cwd, getGlobalInputHashFilePath(target));
      const targetGlobalInputsHashFileDir = path.dirname(targetGlobalInputsHashFile);

      // Make sure the directory exists
      if (!fs.existsSync(targetGlobalInputsHashFileDir)) {
        fs.mkdirSync(targetGlobalInputsHashFileDir, { recursive: true });
      }

      // Write the hash to the file
      fs.writeFileSync(targetGlobalInputsHashFile, targetGlobalInputsHash);
    }
  }

  const infoResult = {
    command: command.args,
    scope,
    packageTasks,
  };

  if (options.outputFile) {
    const parentFolder = path.dirname(options.outputFile);
    if (!fs.existsSync(parentFolder)) {
      await fs.promises.mkdir(parentFolder, { recursive: true });
    }
    const infoJson = JSON.stringify(infoResult, null, options.verbose ? 2 : undefined);
    await fs.promises.writeFile(options.outputFile, infoJson);
    logger.info(`Wrote info to file: ${options.outputFile}`);
  } else {
    logger.info("info", infoResult);
  }
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
  };

  if (target.weight && target.weight !== 1) {
    packageTask.weight = target.weight;
  }

  if (target.options && Object.keys(target.options).length != 0) {
    packageTask.options = target.options;
  }

  return packageTask;
}

function shouldRunWorkersAsService(options: InfoActionOptions) {
  return (typeof process.env.LAGE_WORKER_SERVER === "string" && process.env.LAGE_WORKER_SERVER !== "false") || !!options.server;
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
  } else if (target.type === "worker" && shouldRunWorkersAsService(options)) {
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

function getWorkingDirectory(target: Target) {
  const cwd = process.cwd();
  const workingDirectory = path.relative(getWorkspaceManagerRoot(cwd) ?? "", target.cwd).replace(/\\/g, "/");
  return workingDirectory;
}

function getNpmArgs(task: string, taskTargs: string[]) {
  const extraArgs = taskTargs != undefined && taskTargs.length > 0 ? ["--", ...taskTargs] : [];
  return ["run", task, ...extraArgs];
}
