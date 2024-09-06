import { getConfig, type PipelineDefinition } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { createLageService } from "./lageService.js";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { getPackageAndTask } from "@lage-run/target-graph/lib/targetId.js";
import type { Command } from "commander";

interface WorkerOptions extends ReporterInitOptions {
  nodeArg?: string[];
  port?: number;
  host?: string;
}

function findAllTasks(pipeline: PipelineDefinition) {
  const tasks = new Set<string>();
  for (const key of Object.keys(pipeline)) {
    if (key.includes("#") || key.startsWith("#") || key.endsWith("//")) {
      const { task } = getPackageAndTask(key);
      tasks.add(task);
    } else {
      tasks.add(key);
    }
  }
  return Array.from(tasks);
}

export async function workerAction(options: WorkerOptions, command: Command) {
  const { port = 5332, host = "localhost" } = options;

  const cwd = process.cwd();

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const rpc = (await import("@lage-run/rpc")).default;

  const config = await getConfig(cwd);
  const { pipeline } = config;
  const root = getWorkspaceRoot(cwd)!;
  const packageInfos = getPackageInfos(root);
  const tasks = findAllTasks(pipeline);
  const targetGraph = createTargetGraph({
    logger,
    root,
    dependencies: false,
    dependents: false,
    ignore: [],
    pipeline,
    repoWideChanges: config.repoWideChanges,
    scope: [],
    since: "",
    outputs: config.cacheOptions.outputGlob,
    tasks,
    packageInfos,
  });

  const lageService = await createLageService(targetGraph, logger, config.npmClient, options.concurrency ?? config.concurrency);
  const server = await rpc.createServer(lageService);
  logger.info(`Server listening on http://${host}:${port}`);
  await server.listen({ host, port });
}
