import type { Command } from "commander";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig, getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions, getConcurrency } from "@lage-run/config";
import { getPackageInfosAsync, getWorkspaceRoot } from "workspace-tools";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import { LogReporter } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import { watch } from "./watcher.js";

import type { Reporter } from "@lage-run/logger";
import createLogger, { LogLevel } from "@lage-run/logger";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import type { FilterOptions } from "../../types/FilterOptions.js";
import { createCache } from "../../cache/createCacheProvider.js";

interface RunOptions extends ReporterInitOptions, FilterOptions {
  concurrency: number;
  maxWorkersPerTask: string[];
  profile: string | boolean | undefined;
  skipLocalCache: boolean;
  continue: boolean;
  cache: boolean;
  resetCache: boolean;
  nodeArg: string;
  allowNoTargetRuns: boolean;
}

export async function watchAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  // Configure logger
  const logger = createLogger();
  const reporter = new LogReporter({
    logLevel: LogLevel[options.logLevel],
  });
  logger.addReporter(reporter);

  // Build Target Graph
  const root = getWorkspaceRoot(process.cwd())!;
  const packageInfos = await getPackageInfosAsync(root);

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
        npmScript: {
          script: require.resolve("./runners/NpmScriptRunner.js"),
          options: {
            nodeArg: options.nodeArg,
            taskArgs,
            npmCmd: findNpmClient(config.npmClient),
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
        ...config.runners,
      },
    },
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, concurrency), ...maxWorkersPerTaskMap]),
    hasher,
    workerIdleMemoryLimit: config.workerIdleMemoryLimit, // in bytes
  });

  // Initial run
  const summary = await scheduler.run(root, targetGraph);
  displaySummary(summary, logger.reporters);

  logger.info("Running scheduler in watch mode");

  // Disables cache for subsequent runs
  // TODO: support updating hasher + write-only local cacheProvider for subsequent runs
  for (const targetRun of scheduler.targetRuns.values()) {
    targetRun.options.shouldCache = false;
  }

  // When initial run is done, disable fetching of caches on all targets, keep writing to the cache
  const watcher = await watch(root, packageInfos);
  watcher.on("change", async (packageName) => {
    reporter.resetLogEntries();
    const targets = new Map<string, Target>();
    for (const target of targetGraph.targets.values()) {
      if (target.packageName === packageName) {
        targets.set(target.id, target);
      }
    }

    const deltaGraph = { targets };

    const summary = await scheduler.run(root, deltaGraph, true);
    displaySummary(summary, logger.reporters);
  });
}

function displaySummary(summary: SchedulerRunSummary, reporters: Reporter[]) {
  for (const reporter of reporters) {
    reporter.summarize(summary);
    reporter.cleanup?.();
  }
}
