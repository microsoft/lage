import { getCacheDir } from "./cacheDir.js";
import { getConfig } from "../../config/getConfig.js";
import { getWorkspaceRoot, getWorkspaces } from "workspace-tools";
import { SimpleScheduler } from "@lage-run/scheduler";
import { TargetGraphBuilder } from "@lage-run/target-graph";
import path from "path";
import type { Logger } from "@lage-run/logger";
import { getConcurrency } from "../../config/getConcurrency.js";

export interface ClearCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
}

export async function clearCache(options: ClearCacheOptions) {
  const { logger, cwd, internalCacheFolder } = options;

  const config = await getConfig(cwd);
  const workspaceRoot = getWorkspaceRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const graphBuilder = new TargetGraphBuilder();
  const workspaces = getWorkspaces(workspaceRoot);

  for (const workspace of workspaces) {
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);
    const logOutputCachePath = path.join(workspace.path, "node_modules/.cache/lage/output/");

    graphBuilder.addTarget({
      packageName: workspace.name,
      cwd: workspace.path,
      dependencies: [],
      dependents: [],
      id: `${workspace.name}#clearCache`,
      label: `Clearing Cache for ${workspace.name}`,
      task: "clearCache",
      type: "worker",
      depSpecs: [],
      options: {
        clearPaths: [cachePath, logOutputCachePath],
      },
    });
  }

  const graph = graphBuilder.build();

  const scheduler = new SimpleScheduler({
    logger,
    concurrency,
    continueOnError: true,
    shouldCache: false,
    shouldResetCache: false,
    maxWorkersPerTask: new Map(),
    runners: {
      worker: {
        script: require.resolve("./runners/ClearCacheRunner.js"),
        options: {},
      },
    },
    workerIdleMemoryLimit: config.workerIdleMemoryLimit, // in bytes
  });

  const summary = await scheduler.run(workspaceRoot, graph);
  await scheduler.cleanup();

  logger.reporters.forEach((reporter) => {
    reporter.summarize(summary);
  });
}
