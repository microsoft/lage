import { getConcurrency, getConfig, getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import { LogReporter, type TargetLogger } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { Target, TargetGraph } from "@lage-run/target-graph";
import type { Command } from "commander";
import { getPackageInfos, getPackageInfosAsync, getWorkspaceManagerRoot, type PackageInfos } from "workspace-tools";
import { createCache } from "../../cache/createCacheProvider.js";
import { getBuiltInRunners } from "../../getBuiltInRunners.js";
import { optimizeTargetGraph } from "../../optimizeTargetGraph.js";
import { NoTargetFoundError } from "../../types/errors.js";
import { getLogLevel } from "../createReporter.js";
import { initializeReporters } from "../initializeReporters.js";
import { createFilteredTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import type { RunCommandOptions } from "./index.js";
import { startWatcher } from "./watcher.js";

interface RunContext {
  root: string;
  logger: TargetLogger;
  scheduler: SimpleScheduler;
  targetGraph: TargetGraph;
}

/** Initialize a task run, then execute once or keep the scheduler alive for watch mode. */
export async function action(options: RunCommandOptions, command: Command): Promise<void> {
  const { watch } = options;
  const cwd = process.cwd();
  const config = await getConfig(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);
  const root = getWorkspaceManagerRoot(cwd) || cwd;

  const logger = createLogger();
  if (watch) {
    logger.addReporter(new LogReporter({ logLevel: getLogLevel(options) }));
  } else {
    await initializeReporters({ logger, options: { ...options, concurrency }, config, root });
  }

  const packageInfos = watch ? await getPackageInfosAsync(root) : getPackageInfos(root);
  const { tasks, taskArgs } = filterArgsForTasks(command.args);
  const { targetGraph } = await createFilteredTargetGraph({ root, logger, packageInfos, options, config, tasks });

  if (watch) {
    config.cacheOptions.writeRemoteCache = false;
  } else {
    validateTargetGraph(targetGraph, options.allowNoTargetRuns || config.allowNoTargetRuns);
    logger.verbose(`Running with ${concurrency} workers`);
  }

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
    continueOnError: !!watch || !!options.continue,
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
    workerIdleMemoryLimit: config.workerIdleMemoryLimit,
    logMemory: watch ? undefined : options.logMemory,
  });

  if (watch) {
    await watchForChanges({ root, logger, scheduler, targetGraph, packageInfos });
  } else {
    await runOnce({ root, logger, scheduler, targetGraph });
  }
}

/** Optimize and execute the graph, then shut down the scheduler and report the result. */
async function runOnce({ root, logger, scheduler, targetGraph }: RunContext): Promise<void> {
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

/** Run the initial graph and retain the scheduler for subsequent package changes. */
async function watchForChanges({
  root,
  logger,
  scheduler,
  targetGraph,
  packageInfos,
}: RunContext & { packageInfos: PackageInfos }): Promise<void> {
  const summary = await scheduler.run(root, targetGraph);
  await displaySummary(summary, logger);

  logger.info("Running scheduler in watch mode");

  // Disables cache for subsequent runs
  // TODO: support updating hasher + write-only local cacheProvider for subsequent runs
  for (const targetRun of scheduler.targetRuns.values()) {
    targetRun.options.shouldCache = false;
  }

  const watcher = startWatcher(root, packageInfos);
  watcher.on("change", (packageName) => {
    for (const reporter of logger.reporters) {
      reporter instanceof LogReporter && reporter.resetLogEntries();
    }
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

async function displaySummary(summary: SchedulerRunSummary, logger: TargetLogger): Promise<void> {
  logger.summarize(summary);
  await logger.cleanup();
}

function validateTargetGraph(targetGraph: TargetGraph, allowNoTargetRuns: boolean): void {
  const visibleTargets = Array.from(targetGraph.targets.values()).filter((target) => !target.hidden);
  if (visibleTargets.length === 0 && !allowNoTargetRuns) {
    throw NoTargetFoundError;
  }
}
