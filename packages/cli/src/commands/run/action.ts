import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig";
import { getMaxWorkersPerTask } from "../../config/getMaxWorkersPerTask";
import { getPackageInfos, getWorkspaceRoot, PackageInfos } from "workspace-tools";
import { initializeReporters } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import { TargetGraph } from "@lage-run/target-graph";
import createLogger, { Logger, Reporter } from "@lage-run/logger";
import type { ReporterInitOptions } from "@lage-run/reporters";
import { filterArgsForTasks } from "./filterArgsForTasks";
import { createTargetGraph } from "./createTargetGraph";
import { createCache } from "./createCacheProvider";
import { SchedulerRunSummary, TargetScheduler } from "@lage-run/scheduler-types";
import { watch } from "./watcher";

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
  watch: boolean;
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

  if (options.watch) {
    const scheduler = new SimpleScheduler({
      logger,
      concurrency: options.concurrency,
      cacheProvider: undefined,
      hasher: undefined,
      continueOnError: options.continue,
      shouldCache: options.cache,
      shouldResetCache: options.resetCache,
      maxWorkersPerTask: getMaxWorkersPerTask(config.pipeline ?? {}),
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
    launchWatch({ logger, scheduler, root, targetGraph, packageInfos });
  } else {
    const { cacheProvider, hasher } = createCache({
      root,
      logger,
      cacheOptions: config.cacheOptions,
      skipLocalCache: options.skipLocalCache,
    });

    const scheduler = new SimpleScheduler({
      logger,
      concurrency: options.concurrency,
      cacheProvider,
      hasher,
      continueOnError: options.continue,
      shouldCache: options.cache,
      shouldResetCache: options.resetCache,
      maxWorkersPerTask: getMaxWorkersPerTask(config.pipeline ?? {}),
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
    await launchRun({ logger, scheduler, root, targetGraph });
  }
}

function launchWatch(options: {
  logger: Logger;
  scheduler: TargetScheduler;
  root: string;
  targetGraph: TargetGraph;
  packageInfos: PackageInfos;
}) {
  const { logger, scheduler, root, targetGraph, packageInfos } = options;

  logger.info("running scheduler in watch mode");

  scheduler.run(root, targetGraph);

  const watcher = watch(root);
  watcher.on("change", (packageName) => {
    logger.info(`change detected in ${packageName}`);

    for (const target of targetGraph.targets.values()) {
      if (target.packageName === packageName && scheduler.onTargetChange) {
        console.log("target changed", target.id);
        scheduler.onTargetChange(target.id);
      }
    }
  });
}

async function launchRun(options: { logger: Logger; scheduler: TargetScheduler; root: string; targetGraph: TargetGraph }) {
  const { logger, scheduler, root, targetGraph } = options;
  const summary = await scheduler.run(root, targetGraph);
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
