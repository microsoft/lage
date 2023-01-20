import type { Command } from "commander";
import { createCache } from "./createCacheProvider.js";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { getConfig } from "../../config/getConfig.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { JsonReporter } from "@lage-run/reporters";

import createLogger, { LogLevel } from "@lage-run/logger";

import type { ReporterInitOptions } from "@lage-run/reporters";

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

  // Configure logger (just a dummy one)
  const logger = createLogger();

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
  const info = {};

  for (const target of targets.values()) {
    info[target.id] = {
      ...target,
      hash: await hasher.hash(target),
    };
  }

  process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
}
