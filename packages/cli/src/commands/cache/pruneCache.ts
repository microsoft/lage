import type { Logger } from "@lage-run/logger";
import path from "path";
import { getCacheDir } from "./cacheDir.js";
import { getWorkspaceRoot, getWorkspaces } from "workspace-tools";
import { getConfig } from "../../config/getConfig.js";
import { getConcurrency } from "../../config/getConcurrency.js";
import { TargetGraphBuilder } from "@lage-run/target-graph";
import { SimpleScheduler } from "@lage-run/scheduler";

export interface PruneCacheOptions {
  cwd: string;
  internalCacheFolder: string;
  logger: Logger;
  concurrency: number;
  pruneDays: number;
}

export async function pruneCache(options: PruneCacheOptions) {
  const { logger, cwd, pruneDays, internalCacheFolder } = options;

  const config = await getConfig(cwd);
  const workspaceRoot = getWorkspaceRoot(cwd);
  const concurrency = getConcurrency(options.concurrency, config.concurrency);

  if (!workspaceRoot) {
    return;
  }

  const graphBuilder = new TargetGraphBuilder();
  const workspaces = getWorkspaces(workspaceRoot);

  const prunePeriod = pruneDays || 30;
  const now = new Date().getTime();

  for (const workspace of workspaces) {
    const cachePath = getCacheDir(workspace.path, internalCacheFolder);
    const logOutputCachePath = path.join(workspace.path, "node_modules/.cache/lage/output/");

    graphBuilder.addTarget({
      packageName: workspace.name,
      cwd: workspace.path,
      dependencies: [],
      dependents: [],
      id: `${workspace.name}#pruneCache`,
      label: `Pruning Cache for ${workspace.name}`,
      task: "pruneCache",
      type: "worker",
      depSpecs: [],
      options: {
        clearPaths: [cachePath, logOutputCachePath],
        now,
        prunePeriod,
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
        script: require.resolve("./runners/PruneCacheRunner.js"),
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
