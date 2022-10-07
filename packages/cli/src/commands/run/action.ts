import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig";
import { getFilteredPackages } from "../../filter/getFilteredPackages";
import { getMaxWorkersPerTask } from "../../config/getMaxWorkersPerTask";
import { getPackageInfos, getWorkspaceRoot, PackageInfos } from "workspace-tools";
import { initializeReporters } from "@lage-run/reporters";
import { isRunningFromCI } from "../isRunningFromCI";
import { SimpleScheduler } from "@lage-run/scheduler";
import { TargetGraph, TargetGraphBuilder } from "@lage-run/target-graph";
import createLogger, { Logger, Reporter } from "@lage-run/logger";
import type { ReporterInitOptions } from "@lage-run/reporters";
import { filterArgsForTasks } from "./filterArgsForTasks";
import { createTargetGraph } from "./createTargetGraph";
import { createCache } from "./createCacheProvider";
import { SchedulerRunSummary, TargetScheduler } from "@lage-run/scheduler-types";
import Watchpack from "watchpack";
import path from "path";

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

  if (options.watch) {
    launchWatch({ logger, scheduler, root, targetGraph, packageInfos });
  } else {
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

  // scheduler.run(root, targetGraph);

  var watchpack = new Watchpack({
    // options:
    aggregateTimeout: 1000,
    // fire "aggregated" event when after a change for 1000ms no additional change occurred
    // aggregated defaults to undefined, which doesn't fire an "aggregated" event

    // poll: true,
    // poll: true - use polling with the default interval
    // poll: 10000 - use polling with an interval of 10s
    // poll defaults to undefined, which prefer native watching methods
    // Note: enable polling when watching on a network path
    // When WATCHPACK_POLLING environment variable is set it will override this option

    followSymlinks: true,
    // true: follows symlinks and watches symlinks and real files
    //   (This makes sense when symlinks has not been resolved yet, comes with a performance hit)
    // false (default): watches only specified item they may be real files or symlinks
    //   (This makes sense when symlinks has already been resolved)

    ignored: ["**/.git", "**/node_modules"],
    // ignored: "string" - a glob pattern for files or folders that should not be watched
    // ignored: ["string", "string"] - multiple glob patterns that should be ignored
    // ignored: /regexp/ - a regular expression for files or folders that should not be watched
    // ignored: (entry) => boolean - an arbitrary function which must return truthy to ignore an entry
    // For all cases expect the arbitrary function the path will have path separator normalized to '/'.
    // All subdirectories are ignored too
  });

  const directories = Object.values(packageInfos).map((info) => path.join(root, path.dirname(info.packageJsonPath)));
  watchpack.watch({
    startTime: Date.now() - 10000,
    files: directories.map((d) => path.join(d, "src/**/*")),
  });

  watchpack.on("aggregated", (changes, details) => {
    logger.info("change detected " + JSON.stringify(changes) + " " + JSON.stringify(details));
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
