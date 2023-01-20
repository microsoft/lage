import type { Command } from "commander";
import { createCache } from "./createCacheProvider.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { findNpmClient } from "@lage-run/find-npm-client";
import { getConfig } from "../../config/getConfig.js";
import { getMaxWorkersPerTask, getMaxWorkersPerTaskFromOptions } from "../../config/getMaxWorkersPerTask.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { filterPipelineDefinitions } from "./filterPipelineDefinitions.js";
import { JsonReporter, LogReporter } from "@lage-run/reporters";
import { SimpleScheduler } from "@lage-run/scheduler";
import { watch } from "./watcher.js";

import type { Reporter } from "@lage-run/logger";
import createLogger, { LogLevel } from "@lage-run/logger";

import type { ReporterInitOptions } from "@lage-run/reporters";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";
import { getConcurrency } from "../../config/getConcurrency.js";

interface RunOptions extends ReporterInitOptions {
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  to: string[];
  cache: boolean;
  nodeArg: string;
  ignore: string[];
}

export async function infoAction(options: RunOptions, command: Command) {
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  // Configure logger
  const logger = createLogger();
  const reporter = new JsonReporter({
    logLevel: LogLevel.info,
  });
  logger.addReporter(reporter);

  // Build Target Graph
  const root = getWorkspaceRoot(process.cwd())!;
  const packageInfos = getPackageInfos(root);

  const { tasks } = filterArgsForTasks(command.args);

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

  // Make sure we do not attempt writeRemoteCache in info mode
  config.cacheOptions.writeRemoteCache = false;

  const { hasher } = createCache({
    root,
    logger,
    cacheOptions: config.cacheOptions,
    skipLocalCache: false,
  });

  const { targets } = targetGraph;

  for (const target of targets.values()) {
    logger.info("", {
      target,
      hash: await hasher.hash(target),
    });
  }
}
