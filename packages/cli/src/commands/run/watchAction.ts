import type { Command } from "commander";
import { createCache } from "./createCacheProvider.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig.js";
import { getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "../../config/getMaxWorkersPerTask.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import { LogReporter } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import { watch } from "./watcher.js";

import type { Reporter } from "@lage-run/logger";
import createLogger, { LogLevel } from "@lage-run/logger";

import type { ReporterInitOptions } from "@lage-run/reporters";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";

interface RunOptions extends ReporterInitOptions {
  concurrency: number;
  maxWorkersPerTask: string[];
  profile: string | boolean | undefined;
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  skipLocalCache: boolean;
  continue: boolean;
  cache: boolean;
  resetCache: boolean;
  nodeArg: string;
  ignore: string[];
}

export async function watchAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  // Configure logger
  const logger = createLogger();
  const reporter = new LogReporter({
    grouped: true,
    logLevel: LogLevel[options.logLevel],
  });
  logger.addReporter(reporter);

  // Build Target Graph
  const root = getWorkspaceRoot(process.cwd())!;
  const packageInfos = getPackageInfos(root);

  const { tasks, taskArgs } = filterArgsForTasks(command.args);

  const targetGraph = createTargetGraph({
    logger,
    root,
    dependencies: options.dependencies,
    dependents: options.dependents,
    ignore: options.ignore.concat(config.ignore),
    pipeline: config.pipeline,
    repoWideChanges: config.repoWideChanges,
    scope: options.scope,
    since: options.since,
    outputs: config.cacheOptions.outputGlob,
    tasks,
    packageInfos,
  });

  // Make sure we do not attempt writeRemoteCache in watch mode
  config.cacheOptions.writeRemoteCache = false;

  const { cacheProvider, hasher } = createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    skipLocalCache: false,
  });

  const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

  const maxWorkersPerTaskMap = getMaxWorkersPerTaskFromOptions(options.maxWorkersPerTask);

  const scheduler = new SimpleScheduler({
    logger,
    concurrency: options.concurrency,
    cacheProvider,
    hasher,
    continueOnError: true,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, options.concurrency), ...maxWorkersPerTaskMap]),
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
      ...config.runners,
    },
    workerIdleMemoryLimit: config.workerIdleMemoryLimit, // in bytes
  });

  // Initial run
  const summary = await scheduler.run(root, targetGraph);
  displaySummary(summary, logger.reporters);

  logger.info("Running scheduler in watch mode");

  // Disables cache for subsequent runs
  // TODO: support updating hasher + write-only local cacheProvider for subsequent runs
  for (const targetRun of scheduler.targetRuns.values()) {
    targetRun.options.cacheProvider = undefined;
    targetRun.options.hasher = undefined;
    targetRun.options.shouldCache = false;
  }

  // When initial run is done, disable fetching of caches on all targets, keep writing to the cache
  const watcher = watch(root);
  watcher.on("change", (packageName) => {
    reporter.resetLogEntries();
    for (const target of targetGraph.targets.values()) {
      if (target.packageName === packageName && scheduler.onTargetChange) {
        scheduler.onTargetChange(target.id);
      }
    }
  });
}

function displaySummary(summary: SchedulerRunSummary, reporters: Reporter[]) {
  for (const reporter of reporters) {
    reporter.summarize(summary);
  }
}
