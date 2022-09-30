import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { getConfig } from "../../config/getConfig";
import { getFilteredPackages } from "../../filter/getFilteredPackages";
import { getMaxWorkersPerTask } from "../../config/getMaxWorkersPerTask";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { isRunningFromCI } from "../isRunningFromCI";
import { SimpleScheduler } from "@lage-run/scheduler";
import { getPackageAndTask, Target, TargetGraphBuilder } from "@lage-run/target-graph";
import { WorkerPool } from "@lage-run/worker-threads-pool";
import createLogger, { Logger, LogLevel, Reporter } from "@lage-run/logger";
import { initializeReporters } from "@lage-run/reporters";
import type { ReporterInitOptions } from "@lage-run/reporters";

function filterArgsForTasks(args: string[]) {
  const optionsPosition = args.findIndex((arg) => arg.startsWith("-"));
  return {
    tasks: args.slice(0, optionsPosition === -1 ? undefined : optionsPosition),
    taskArgs: optionsPosition === -1 ? [] : args.slice(optionsPosition),
  };
}

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
  nodeargs: string;
}

export async function runAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = getConfig(cwd);

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

  const builder = new TargetGraphBuilder(root, packageInfos);

  const { tasks, taskArgs } = filterArgsForTasks(command.args);

  const packages = getFilteredPackages({
    root,
    logger,
    packageInfos,
    includeDependencies: options.dependencies,
    includeDependents: options.dependents,
    since: options.since,
    scope: options.scope,
    repoWideChanges: config.repoWideChanges,
    sinceIgnoreGlobs: config.ignore,
  });

  for (const [id, definition] of Object.entries(config.pipeline)) {
    if (Array.isArray(definition)) {
      builder.addTargetConfig(id, {
        cache: true,
        dependsOn: definition,
        options: {},
        outputs: config.cacheOptions.outputGlob,
      });
    } else {
      builder.addTargetConfig(id, definition);
    }
  }

  const targetGraph = builder.buildTargetGraph(tasks, packages);

  // Create Cache Provider

  const cacheProvider = new RemoteFallbackCacheProvider({
    root,
    logger,
    localCacheProvider:
      options.skipLocalCache === true
        ? undefined
        : new BackfillCacheProvider({
            root,
            cacheOptions: {
              outputGlob: config.cacheOptions.outputGlob,
              ...(config.cacheOptions.internalCacheFolder && { internalCacheFolder: config.cacheOptions.internalCacheFolder }),
            },
          }),
    remoteCacheProvider: config.cacheOptions?.cacheStorageConfig
      ? new BackfillCacheProvider({ root, cacheOptions: config.cacheOptions })
      : undefined,
    writeRemoteCache:
      config.cacheOptions?.writeRemoteCache === true || String(process.env.LAGE_WRITE_CACHE).toLowerCase() === "true" || isRunningFromCI,
  });

  const hasher = new TargetHasher({
    root,
    environmentGlob: config.cacheOptions.environmentGlob,
    cacheKey: config.cacheOptions.cacheKey,
  });

  const pool = new WorkerPool({
    maxWorkers: options.concurrency,
    script: require.resolve("./targetWorker"),
    workerOptions: {
      stdout: true,
      stderr: true,
      workerData: {
        taskArgs,
        npmClient: config.npmClient,
        ...options,
      },
    },
  });

  // pool.on(kWorkerAddedEvent, (worker) => {
  //   captureWorkerStdioStreams(logger, worker);
  // });

  const scheduler = new SimpleScheduler({
    logger,
    concurrency: options.concurrency,
    cacheProvider,
    hasher,
    continueOnError: options.continue,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    pool,
    maxWorkersPerTask: getMaxWorkersPerTask(config.pipeline ?? {})
  });

  const summary = await scheduler.run(root, targetGraph);

  try {
    for (const reporter of logger.reporters) {
      reporter.summarize(summary);
    }
  } catch (e) {}

  if (summary.results !== "success") {
    process.exitCode = 1;
  }
}
