import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { Command } from "commander";
import { createProfileReporter } from "./createProfileReporter";
import { findNpmClient } from "../../workspace/findNpmClient";
import { getConfig } from "../../config/getConfig";
import { getFilteredPackages } from "../../filter/getFilteredPackages";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { initializeReporters } from "../../reporters/initialize";
import { isRunningFromCI } from "../isRunningFromCI";
import { NpmScriptRunner, SimpleScheduler, WorkerRunner, TargetRunnerPicker } from "@lage-run/scheduler";
import { TargetGraphBuilder } from "@lage-run/target-graph";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/LoggerOptions";
import type { TargetRunner } from "@lage-run/scheduler";

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
  ignore: string[];
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

  // Run Tasks with Scheduler + NpmScriptRunner
  const runners: Record<string, TargetRunner> = {
    npmScript: new NpmScriptRunner({
      logger,
      nodeOptions: options.nodeargs,
      taskArgs,
      npmCmd: findNpmClient(config.npmClient),
    }),
    worker: new WorkerRunner({
      logger,
      workerTargetConfigs: Object.entries(config.pipeline).reduce((workerTargetConfigs, [id, def]) => {
        if (!Array.isArray(def) && def.type === "worker") {
          workerTargetConfigs[id] = def;
        }

        return workerTargetConfigs;
      }, {}),
    }),
  };

  const runnerPicker = new TargetRunnerPicker({
    runners,
  });

  const scheduler = new SimpleScheduler({
    logger,
    concurrency: options.concurrency,
    cacheProvider,
    hasher,
    continueOnError: options.continue,
    shouldCache: options.cache,
    shouldResetCache: options.resetCache,
    runnerPicker,
  });

  const summary = await scheduler.run(root, targetGraph);

  for (const runner of Object.values(runners)) {
    if (runner.cleanup) {
      await runner.cleanup();
    }
  }

  for (const reporter of logger.reporters) {
    reporter.summarize(summary);
  }

  if (summary.results !== "success") {
    process.exitCode = 1;
  }
}
