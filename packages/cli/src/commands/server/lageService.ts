import { type ConfigOptions, getConfig, getConcurrency, getMaxWorkersPerTask } from "@lage-run/config";
import type { Logger } from "@lage-run/logger";
import { ConnectError, Code, type ILageService } from "@lage-run/rpc";
import { getStartTargetId, getTargetId, type Target, type TargetGraph } from "@lage-run/target-graph";
import { type DependencyMap, getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { type Readable } from "stream";
import { type Pool, AggregatedPool } from "@lage-run/worker-threads-pool";
import { getInputFiles, type PackageTree, TargetHasher } from "@lage-run/hasher";
import { getOutputFiles } from "./getOutputFiles.js";
import { glob } from "@lage-run/globby";
import { MemoryStream } from "./MemoryStream.js";
import { runnerPickerOptions } from "../../runnerPickerOptions.js";
import { filterPipelineDefinitions } from "../run/filterPipelineDefinitions.js";
import type { TargetRun } from "@lage-run/scheduler-types";
import { formatDuration, hrToSeconds, hrtimeDiff } from "@lage-run/format-hrtime";
import path from "path";
import fs from "fs";

interface LageServiceContext {
  config: ConfigOptions;
  targetGraph: TargetGraph;
  packageTree: PackageTree;
  dependencyMap: DependencyMap;
  root: string;
  pool: Pool;
  globalInputs: string[];
  targetHasher: TargetHasher;
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

async function createInitializedPromise({ cwd, logger, serverControls, nodeArg, taskArgs, concurrency, tasks }: InitializeOptions) {
  if (initializedPromise) {
    return initializedPromise;
  }

  const config = await getConfig(cwd);
  const root = getWorkspaceRoot(cwd)!;
  const maxWorkers = getConcurrency(concurrency, config.concurrency);

  logger.info(`Initializing with ${maxWorkers} workers, tasks: ${tasks.join(", ")}`);

  const { pipeline } = config;

  const packageInfos = getPackageInfos(root);

  logger.info("Initializing target graph");
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
    priorities: config.priorities,
  });

  const targetHasher = new TargetHasher({
    root,
    environmentGlob: config.cacheOptions?.environmentGlob ?? [],
    logger,
    cacheKey: config.cacheOptions?.cacheKey,
    cliArgs: taskArgs,
  });

  logger.info("Initializing hasher");
  await targetHasher.initialize();

  logger.info("Initializing dependency map");

  const packageTree = targetHasher.packageTree!;
  const dependencyMap = targetHasher.dependencyMap;

  const filteredPipeline = filterPipelineDefinitions(targetGraph.targets.values(), config.pipeline);

  logger.info("Initializing Pool");
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
    workerIdleMemoryLimit: config.workerIdleMemoryLimit,
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

  const globalInputs = config.cacheOptions?.environmentGlob
    ? glob(config.cacheOptions?.environmentGlob, { cwd: root, gitignore: true })
    : ["lage.config.js"];

  logger.info(`Environment glob inputs: \n${JSON.stringify(globalInputs)}\n-------`);

  logger.info("done initializing");
  return { config, targetGraph, packageTree, dependencyMap, root, pool, globalInputs, targetHasher };
}

/**
 * Initializes the lageService: the extra "initializePromise" ensures only one initialization is done at a time across threads
 * @param cwd
 * @param logger
 * @returns
 */
async function initialize(options: InitializeOptions): Promise<LageServiceContext> {
  initializedPromise = createInitializedPromise(options);
  return initializedPromise;
}

interface CreateLageServiceOptions {
  cwd: string;
  serverControls: ServiceControls;
  logger: Logger;
  concurrency?: number;
  tasks: string[];
}

function getHashFilePath(target: Target) {
  return path.join(`node_modules/.lage/hash_${target.task}`);
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
      if (global.gc) {
        global.gc();
      }

      serverControls.clearCountdown();

      // THIS IS A BIG ASSUMPTION; TODO: memoize based on the parameters of the initialize() call
      // The first request sets up the nodeArg and taskArgs - we are assuming that all requests to run this target are coming from the same
      // `lage info` call
      const { config, targetGraph, dependencyMap, packageTree, root, pool, globalInputs, targetHasher } = await initialize({
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

      logger.info(`Running target: ${request.packageName}#${request.task}`);

      const target = targetGraph.targets.get(id)!;
      const task = {
        target,
        runners,
      };

      const writableStdout = new MemoryStream();
      const writableStderr = new MemoryStream();
      let pipedStdout: Readable;
      let pipedStderr: Readable;

      const targetRun: TargetRun = {
        queueTime: process.hrtime(),
        target,
        duration: [0, 0],
        startTime: [0, 0],
        status: "queued",
        threadId: 0,
      };

      const targetGlobalInputs = target.environmentGlob ? glob(target.environmentGlob, { cwd: root, gitignore: true }) : globalInputs;

      let results: {
        packageName?: string;
        task: string;
        exitCode: number;
        inputs: string[];
        outputs: string[];
        stdout: string;
        stderr: string;
        id: string;
        globalInputs: string[];
      };

      const inputs = getInputFiles(target, dependencyMap, packageTree);

      for (const dep of target.dependencies) {
        if (dep === getStartTargetId()) {
          continue;
        }

        const depTarget = targetGraph.targets.get(dep)!;
        inputs.push(path.join(path.relative(root, depTarget.cwd), getHashFilePath(depTarget)).replace(/\\/g, "/"));
      }

      const targetHashFile = getHashFilePath(target);
      const targetHashFullPath = path.join(target.cwd, targetHashFile);

      try {
        if (!fs.existsSync(path.dirname(targetHashFullPath))) {
          fs.mkdirSync(path.dirname(targetHashFullPath), { recursive: true });
        }

        fs.writeFileSync(targetHashFullPath, await targetHasher.hash(target));
      } catch (e) {
        throw new ConnectError(`Error writing target hash file: ${targetHashFullPath}`, Code.Internal);
      }

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

            targetRun.threadId = worker.threadId;
            targetRun.status = "running";
            targetRun.startTime = process.hrtime();
          },
          (worker) => {
            logger.info(`Max Worker Memory Usage: ${formatBytes(pool.stats().maxWorkerMemoryUsage)}`);

            // logger.info the main process memory usage
            const memoryUsage = process.memoryUsage();
            logger.info(
              `Main Process Memory Usage: RSS: ${formatBytes(memoryUsage.rss)} Heap Total: ${formatBytes(
                memoryUsage.heapTotal
              )} Heap Used: ${formatBytes(memoryUsage.heapUsed)}`
            );

            targetRun.status = "success";
            targetRun.duration = hrtimeDiff(targetRun.startTime, process.hrtime());

            logger.info(
              `[${worker.threadId}] ${request.packageName}#${request.task} end: ${formatDuration(hrToSeconds(targetRun.duration))}`
            );
            pipedStdout.unpipe(writableStdout);
            pipedStderr.unpipe(writableStderr);
          }
        );

        const outputs = getOutputFiles(root, target, config.cacheOptions?.outputGlob, packageTree);
        outputs.push(targetHashFile);

        results = {
          packageName: request.packageName,
          task: request.task,
          exitCode: 0,
          inputs,
          outputs,
          stdout: writableStdout.toString(),
          stderr: writableStderr.toString(),
          id,
          globalInputs: targetGlobalInputs,
        };
      } catch (e) {
        const outputs = getOutputFiles(root, target, config.cacheOptions?.outputGlob, packageTree);
        outputs.push(targetHashFile);

        targetRun.status = "failed";
        targetRun.duration = hrtimeDiff(targetRun.startTime, process.hrtime());

        results = {
          packageName: request.packageName,
          task: request.task,
          exitCode: 1,
          inputs,
          outputs,
          stdout: "",
          stderr: e instanceof Error ? e.toString() : "",
          id,
          globalInputs: targetGlobalInputs,
        };
      }

      logger.info(
        `${request.packageName}#${request.task} results: \n${JSON.stringify(
          {
            packageName: results.packageName,
            task: results.task,
            exitCode: results.exitCode,
            inputs: results.inputs,
            outputs: results.outputs,
            id: results.id,
            globalInputs: `(${target.environmentGlob ? "custom target env glob used" : "general global inputs used"}): ${
              results.globalInputs.length
            } files`,
          },
          null,
          2
        )}\n------`,
        results
      );

      return results;
    },
  };
}
