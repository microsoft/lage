import type { Command } from "commander";
import { createTargetGraph } from "./createTargetGraph.js";
import { filterArgsForTasks } from "./filterArgsForTasks.js";
import { getConfig } from "@lage-run/config";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import createLogger from "@lage-run/logger";

import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { getStartTargetId } from "@lage-run/target-graph";

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

  const { targets } = targetGraph;

  for (const target of targets.values()) {
    if (target.id === getStartTargetId()) {
      continue;
    }

    const startIdIndex = target.dependencies.indexOf(getStartTargetId());
    target.dependencies.splice(startIdIndex, 1);

    process.stdout.write(`${JSON.stringify(target)}\n`);
  }
}
