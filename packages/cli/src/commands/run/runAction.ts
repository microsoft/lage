import type { Command } from "commander";
import { createCache } from "./createCacheProvider.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig.js";
import { getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "../../config/getMaxWorkersPerTask.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { initializeReporters } from "../initializeReporters.js";
import { SimpleScheduler } from "@lage-run/scheduler";

import type { Reporter } from "@lage-run/logger";
import createLogger from "@lage-run/logger";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { FilterOptions } from "../../types/FilterOptions.js";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import { getConcurrency } from "../../config/getConcurrency.js";
import type { TargetGraph } from "@lage-run/target-graph";
import { NoTargetFoundError } from "../../types/errors.js";

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

export async function runAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  // Merged options
  const concurrency = getConcurrency(options.concurrency, config.concurrency);
  const allowNoTargetRuns = options.allowNoTargetRuns || config.allowNoTargetRuns;

  // Configure logger
  const logger = createLogger();

  initializeReporters(logger, { ...options, concurrency });

  // Build Target Graph
  const root = getWorkspaceRoot(process.cwd())!;
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

  validateTargetGraph(targetGraph, allowNoTargetRuns);

  const { cacheProvider, hasher } = createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    skipLocalCache: options.skipLocalCache,
    cliArgs: taskArgs,
  });

  logger.verbose(`Running with ${concurrency} workers`);

  const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

  const maxWorkersPerTaskMap = getMaxWorkersPerTaskFromOptions(options.maxWorkersPerTask);

  const scheduler = new SimpleScheduler({
    logger,
    concurrency,
    cacheProvider,
    hasher,
    continueOnError: options.continue,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, concurrency), ...maxWorkersPerTaskMap]),
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

  const summary = await scheduler.run(root, targetGraph);
  await scheduler.cleanup();

  displaySummaryAndExit(summary, logger.reporters);
}

function displaySummaryAndExit(summary: SchedulerRunSummary, reporters: Reporter[]) {
  if (summary.results !== "success") {
    process.exitCode = 1;
  }

  for (const reporter of reporters) {
    reporter.summarize(summary);
  }
}

function validateTargetGraph(targetGraph: TargetGraph, allowNoTargetRuns: boolean) {
  const visibleTargets = Array.from(targetGraph.targets.values()).filter((target) => !target.hidden);
  if (visibleTargets.length === 0 && !allowNoTargetRuns) {
    throw NoTargetFoundError;
  }
}
