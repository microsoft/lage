import { getConcurrency, getConfig, getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import { SimpleScheduler } from "@lage-run/scheduler";
import type { TargetGraph } from "@lage-run/target-graph";
import type { Command } from "commander";
import { getPackageInfos, getWorkspaceManagerRoot } from "workspace-tools";
import { createCache } from "../../cache/createCacheProvider.js";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import { getBuiltInRunners } from "../../getBuiltInRunners.js";
import { optimizeTargetGraph } from "../../optimizeTargetGraph.js";
import { NoTargetFoundError } from "../../types/errors.js";
import { initializeReporters } from "../initializeReporters.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import type { RunCommandOptions } from "./index.js";

export async function runAction(options: RunCommandOptions, command: Command): Promise<void> {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  // Merged options
  const concurrency = getConcurrency(options.concurrency, config.concurrency);
  const allowNoTargetRuns = options.allowNoTargetRuns || config.allowNoTargetRuns;

  // Configure logger
  const logger = createLogger();

  const root = getWorkspaceManagerRoot(cwd) ?? cwd;
  await initializeReporters({ logger, options: { ...options, concurrency }, config, root });

  // Build Target Graph
  const packageInfos = getPackageInfos(root);

  const { tasks, taskArgs } = filterArgsForTasks(command.args);

  const { packages, changes } = getFilteredPackages({
    root,
    logger,
    packageInfos,
    options,
    config,
    collectChangesForSince: true,
  });

  const targetGraph = await createTargetGraph({ root, packages, changes, config, tasks, packageInfos });

  validateTargetGraph(targetGraph, allowNoTargetRuns);

  logger.verbose(`Running with ${concurrency} workers`);

  const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

  const maxWorkersPerTaskMap = getMaxWorkersPerTaskFromOptions(options.maxWorkersPerTask);

  const { hasher } = await createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    cliArgs: taskArgs,
    skipLocalCache: options.skipLocalCache,
  });

  const scheduler = new SimpleScheduler({
    logger,
    concurrency,
    continueOnError: !!options.continue,
    shouldCache: options.cache,
    shouldResetCache: !!options.resetCache,
    workerData: {
      root,
      taskArgs,
      skipLocalCache: options.skipLocalCache,
      cacheOptions: config.cacheOptions,
      runners: {
        ...getBuiltInRunners({ nodeArg: options.nodeArg, npmCmd: config.npmClient, taskArgs }),
        ...config.runners,
      },
    },
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, concurrency), ...maxWorkersPerTaskMap]),
    hasher,
    workerIdleMemoryLimit: config.workerIdleMemoryLimit, // in bytes
    logMemory: options.logMemory,
  });

  const optimizedTargets = await optimizeTargetGraph(targetGraph, scheduler.runnerPicker, false);
  const optimizedGraph: TargetGraph = {
    targets: new Map(optimizedTargets.map((target) => [target.id, target])),
  };

  const summary = await scheduler.run(root, optimizedGraph);
  await scheduler.cleanup();

  if (summary.results !== "success") {
    process.exitCode = 1;
  }

  logger.summarize(summary);
  await logger.cleanup();
}

function validateTargetGraph(targetGraph: TargetGraph, allowNoTargetRuns: boolean) {
  const visibleTargets = Array.from(targetGraph.targets.values()).filter((target) => !target.hidden);
  if (visibleTargets.length === 0 && !allowNoTargetRuns) {
    throw NoTargetFoundError;
  }
}
