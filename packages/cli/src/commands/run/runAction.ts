import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig";
import { getMaxWorkersPerTask } from "../../config/getMaxWorkersPerTask";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { initializeReporters } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import createLogger, { Reporter } from "@lage-run/logger";
import { filterArgsForTasks } from "./filterArgsForTasks";
import { createTargetGraph } from "./createTargetGraph";
import { createCache } from "./createCacheProvider";

import type { ReporterInitOptions } from "@lage-run/reporters";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { PipelineDefinition } from "../../types/PipelineDefinition";

interface RunOptions extends ReporterInitOptions {
  concurrency: number;
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

  const scheduler = new SimpleScheduler({
    logger,
    concurrency: options.concurrency,
    cacheProvider,
    hasher,
    continueOnError: options.continue,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    maxWorkersPerTask: getMaxWorkersPerTask(config.pipeline ?? {}, options.concurrency),
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
