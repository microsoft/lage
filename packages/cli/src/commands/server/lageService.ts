import { type ConfigOptions, getConfig, type PipelineDefinition, getConcurrency, getMaxWorkersPerTask } from "@lage-run/config";
import type { Logger } from "@lage-run/logger";
import type { ILageService } from "@lage-run/rpc";
import { getTargetId, type TargetGraph } from "@lage-run/target-graph";
import { type DependencyMap, getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { getPackageAndTask } from "@lage-run/target-graph";
import { type Readable } from "stream";
import { type Pool, AggregatedPool } from "@lage-run/worker-threads-pool";
import { getInputFiles, PackageTree } from "@lage-run/hasher";
import { createDependencyMap } from "workspace-tools";
import { getOutputFiles } from "./getOutputFiles.js";
import { glob } from "@lage-run/globby";
import { MemoryStream } from "./MemoryStream.js";
import { runnerPickerOptions } from "../../runnerPickerOptions.js";
import { filterPipelineDefinitions } from "../run/filterPipelineDefinitions.js";

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

interface LageServiceContext {
  config: ConfigOptions;
  targetGraph: TargetGraph;
  packageTree: PackageTree;
  dependencyMap: DependencyMap;
  root: string;
  pool: Pool;
}

let initializedPromise: Promise<LageServiceContext> | undefined;
interface ServiceControls {
  abortController: AbortController;
  countdownToShutdown: () => void;
  clearCountdown: () => void;
}
interface InitializeOptions {
  cwd: string;
  logger: Logger;
  serverControls: ServiceControls;
  concurrency?: number;
  nodeArg?: string;
  taskArgs: string[];
  tasks: string[];
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Initializes the lageService: the extra "initializePromise" ensures only one initialization is done at a time across threads
 * @param cwd
 * @param logger
 * @returns
 */
async function initialize({
  cwd,
  logger,
  serverControls,
  nodeArg,
  taskArgs,
  concurrency,
  tasks,
}: InitializeOptions): Promise<LageServiceContext> {
  async function createInitializedPromise() {
    if (initializedPromise) {
      return initializedPromise;
    }

    const config = await getConfig(cwd);
    const root = getWorkspaceRoot(cwd)!;
    const maxWorkers = getConcurrency(concurrency, config.concurrency);

    logger.info(`Initializing with ${maxWorkers} workers, tasks: ${tasks.join(", ")}`);

    const { pipeline } = config;

    const packageInfos = getPackageInfos(root);

    const targetGraph = await createTargetGraph({
      logger,
      root,
      dependencies: false,
      dependents: false,
      ignore: [],
      pipeline,
      repoWideChanges: config.repoWideChanges,
      scope: undefined,
      since: undefined,
      outputs: config.cacheOptions.outputGlob,
      tasks,
      packageInfos,
    });

    const dependencyMap = createDependencyMap(packageInfos, { withDevDependencies: true, withPeerDependencies: false });
    const packageTree = new PackageTree({
      root,
      packageInfos,
      includeUntracked: true,
    });

    logger.info("Initializing Package Tree");
    await packageTree.initialize();

    const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

    const pool = new AggregatedPool({
      logger,
      maxWorkersByGroup: new Map([...getMaxWorkersPerTask(filteredPipeline, maxWorkers)]),
      groupBy: ({ target }) => target.task,
      maxWorkers,
      script: require.resolve("./singleTargetWorker.js"),
      workerOptions: {
        stdout: true,
        stderr: true,
        workerData: {
          runners: {
            ...runnerPickerOptions(nodeArg, config.npmClient, taskArgs),
            ...config.runners,
            shouldCache: false,
            shouldResetCache: false,
          },
        },
      },
    });

    serverControls.abortController.signal.addEventListener("abort", () => {
      pool?.close();
    });

    pool?.on("freedWorker", () => {
      logger.silly(`Max Worker Memory Usage: ${formatBytes(pool?.stats().maxWorkerMemoryUsage)}`);
    });

    pool?.on("idle", () => {
      logger.info("All workers are idle, shutting down after timeout");
      serverControls.countdownToShutdown();
    });

    return { config, targetGraph, packageTree, dependencyMap, root, pool };
  }

  initializedPromise = createInitializedPromise();

  return await initializedPromise;
}

interface CreateLageServiceOptions {
  cwd: string;
  serverControls: ServiceControls;
  logger: Logger;
  concurrency?: number;
  tasks: string[];
}

export async function createLageService({
  cwd,
  serverControls,
  logger,
  concurrency,
  tasks,
}: CreateLageServiceOptions): Promise<ILageService> {
  return {
    async ping() {
      return { pong: true };
    },

    async runTarget(request) {
      serverControls.clearCountdown();

      // THIS IS A BIG ASSUMPTION; TODO: memoize based on the parameters of the initialize() call
      // The first request sets up the nodeArg and taskArgs - we are assuming that all requests to run this target are coming from the same
      // `lage info` call
      const { config, targetGraph, dependencyMap, packageTree, root, pool } = await initialize({
        cwd,
        logger,
        nodeArg: request.nodeOptions,
        taskArgs: request.taskArgs,
        serverControls,
        concurrency,
        tasks,
      });

      const runners = runnerPickerOptions(request.nodeOptions, config.npmClient, request.taskArgs);

      const id = getTargetId(request.packageName, request.task);

      if (!targetGraph.targets.has(id)) {
        logger.info(`Target not found: ${request.packageName}#${request.task}`);
        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
        };
      }

      const target = targetGraph.targets.get(id)!;
      const task = {
        target,
        runners,
      };

      const writableStdout = new MemoryStream();
      const writableStderr = new MemoryStream();
      let pipedStdout: Readable;
      let pipedStderr: Readable;

      try {
        await pool.exec(
          task,
          0,
          (worker, stdout, stderr) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} start`);

            pipedStdout = stdout;
            pipedStderr = stderr;

            stdout.pipe(writableStdout);
            stderr.pipe(writableStderr);
          },
          (worker) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} end`);
            pipedStdout.unpipe(writableStdout);
            pipedStderr.unpipe(writableStderr);
          }
        );

        const globalInputs = target.environmentGlob
          ? glob(target.environmentGlob, { cwd: root, gitignore: true })
          : config.cacheOptions?.environmentGlob
          ? glob(config.cacheOptions?.environmentGlob, { cwd: root, gitignore: true })
          : ["lage.config.js"];
        const inputs = (getInputFiles(target, dependencyMap, packageTree) ?? []).concat(globalInputs);

        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 0,
          hash: "",
          inputs,
          outputs: getOutputFiles(root, target, config.cacheOptions?.outputGlob, packageTree),
          stdout: writableStdout.toString(),
          stderr: writableStderr.toString(),
          id,
        };
      } catch (e) {
        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
          hash: "",
          inputs: [],
          outputs: [],
          stdout: "",
          stderr: e instanceof Error ? e.toString() : "",
          id,
        };
      }
    },
  };
}
