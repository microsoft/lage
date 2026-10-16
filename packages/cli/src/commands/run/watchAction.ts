import { getConcurrency, getConfig, getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import { LogReporter, type TargetLogger } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import type { Command } from "commander";
import { getPackageInfosAsync, getWorkspaceManagerRoot } from "workspace-tools";
import { createCache } from "../../cache/createCacheProvider.js";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import { getBuiltInRunners } from "../../getBuiltInRunners.js";
import { getLogLevel } from "../createReporter.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import type { RunCommandOptions } from "./index.js";
import { watch } from "./watcher.js";

export async function watchAction(options: RunCommandOptions, command: Command): Promise<void> {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  // Configure logger
  const logger = createLogger();
  const reporter = new LogReporter({ logLevel: getLogLevel(options) });
  logger.addReporter(reporter);

  // Build Target Graph
  const root = getWorkspaceManagerRoot(process.cwd())!;
  const packageInfos = await getPackageInfosAsync(root);

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

  // Make sure we do not attempt writeRemoteCache in watch mode
  config.cacheOptions.writeRemoteCache = false;

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
    continueOnError: true,
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
    shouldCache: options.cache,
    shouldResetCache: !!options.resetCache,
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, concurrency), ...maxWorkersPerTaskMap]),
    hasher,
    workerIdleMemoryLimit: config.workerIdleMemoryLimit, // in bytes
  });

  // Initial run
  const summary = await scheduler.run(root, targetGraph);
  await displaySummary(summary, logger);

  logger.info("Running scheduler in watch mode");

  // Disables cache for subsequent runs
  // TODO: support updating hasher + write-only local cacheProvider for subsequent runs
  for (const targetRun of scheduler.targetRuns.values()) {
    targetRun.options.shouldCache = false;
  }

  // When initial run is done, disable fetching of caches on all targets, keep writing to the cache
  const watcher = watch(root, packageInfos);
  watcher.on("change", (packageName) => {
    reporter.resetLogEntries();
    const targets = new Map<string, Target>();
    for (const target of targetGraph.targets.values()) {
      if (target.packageName === packageName) {
        targets.set(target.id, target);
      }
    }

    const deltaGraph = { targets };

    void (async () => {
      const deltaSummary = await scheduler.run(root, deltaGraph, true);
      await displaySummary(deltaSummary, logger);
    })().catch(() => {});
  });
}

async function displaySummary(summary: SchedulerRunSummary, logger: TargetLogger) {
  logger.summarize(summary);
  await logger.cleanup();
}
