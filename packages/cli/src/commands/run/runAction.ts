import type { Command } from "commander";
import { createCache } from "./createCacheProvider.js";
import { createProfileReporter } from "./createProfileReporter.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig.js";
import { getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "../../config/getMaxWorkersPerTask.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { initializeReporters } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";

import type { Reporter } from "@lage-run/logger";
import createLogger from "@lage-run/logger";

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

export async function runAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  // Configure logger
  const logger = createLogger();

  initializeReporters(logger, options);

  if (options.profile !== undefined) {
    const reporter = createProfileReporter(options);
    logger.addReporter(reporter);
  }

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

  const { cacheProvider, hasher } = createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    skipLocalCache: options.skipLocalCache,
  });

  logger.verbose(`Running with ${options.concurrency} workers`);

  const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

  const maxWorkersPerTaskMap = getMaxWorkersPerTaskFromOptions(options.maxWorkersPerTask);

  const scheduler = new SimpleScheduler({
    logger,
    concurrency: options.concurrency,
    cacheProvider,
    hasher,
    continueOnError: options.continue,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    maxWorkersPerTask: new Map([...getMaxWorkersPerTask(filteredPipeline, options.concurrency), ...maxWorkersPerTaskMap]),
    runners: {
      npmScript: {
        script: require.resolve("./runners/NpmScriptRunner"),
        options: {
          nodeArg: options.nodeArg,
          taskArgs,
          npmCmd: findNpmClient(config.npmClient),
        },
      },
      worker: {
        script: require.resolve("./runners/WorkerRunner"),
        options: {},
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
