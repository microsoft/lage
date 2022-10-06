import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig";
import { getFilteredPackages } from "../../filter/getFilteredPackages";
import { getMaxWorkersPerTask } from "../../config/getMaxWorkersPerTask";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { initializeReporters } from "@lage-run/reporters";
import { isRunningFromCI } from "../isRunningFromCI";
import { SimpleScheduler } from "@lage-run/scheduler";
import { TargetGraphBuilder } from "@lage-run/target-graph";
import createLogger from "@lage-run/logger";
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
    sinceIgnoreGlobs: options.ignore.concat(config.ignore),
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

  const hasRemoteCacheConfig =
    !!config.cacheOptions?.cacheStorageConfig || !!process.env.BACKFILL_CACHE_PROVIDER || !!process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;

  // Create Cache Provider
  const cacheProvider = new RemoteFallbackCacheProvider({
    root,
    logger,
    localCacheProvider:
      options.skipLocalCache === true
        ? undefined
        : new BackfillCacheProvider({
            logger,
            root,
            cacheOptions: {
              outputGlob: config.cacheOptions.outputGlob,
              ...(config.cacheOptions.internalCacheFolder && { internalCacheFolder: config.cacheOptions.internalCacheFolder }),
            },
          }),
    remoteCacheProvider: hasRemoteCacheConfig ? new BackfillCacheProvider({ logger, root, cacheOptions: config.cacheOptions }) : undefined,
    writeRemoteCache:
      config.cacheOptions?.writeRemoteCache === true || String(process.env.LAGE_WRITE_CACHE).toLowerCase() === "true" || isRunningFromCI,
  });

  const hasher = new TargetHasher({
    root,
    environmentGlob: config.cacheOptions.environmentGlob,
    cacheKey: config.cacheOptions.cacheKey,
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

  const summary = await scheduler.run(root, targetGraph);

  if (summary.results !== "success") {
    process.exitCode = 1;
  }

  for (const reporter of logger.reporters) {
    reporter.summarize(summary);
  }
}
