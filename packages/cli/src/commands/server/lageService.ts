import { type ConfigOptions, getConfig, type PipelineDefinition } from "@lage-run/config";
import type { Logger } from "@lage-run/logger";
import type { ILageService } from "@lage-run/rpc";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";
import { getTargetId, type TargetGraph } from "@lage-run/target-graph";
import { type DependencyMap, getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { createTargetGraph } from "../run/createTargetGraph.js";
import { getPackageAndTask } from "@lage-run/target-graph";
import { type Readable } from "stream";
import { WorkerPool } from "@lage-run/worker-threads-pool";
import { getInputFiles, PackageTree } from "@lage-run/hasher";
import { createDependencyMap } from "workspace-tools";
import { getOutputFiles } from "./getOutputFiles.js";
import { glob } from "@lage-run/globby";

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

let context:
  | { config: ConfigOptions; targetGraph: TargetGraph; packageTree: PackageTree; dependencyMap: DependencyMap; root: string }
  | undefined;

async function initializeOnce(cwd: string, logger: Logger) {
  if (!context) {
    const config = await getConfig(cwd);
    const root = getWorkspaceRoot(cwd)!;

    const { pipeline } = config;

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

    const dependencyMap = createDependencyMap(packageInfos, { withDevDependencies: true, withPeerDependencies: false });
    const packageTree = new PackageTree({
      root,
      packageInfos,
      includeUntracked: true,
    });

    await packageTree.initialize();

    context = { config, targetGraph, packageTree, dependencyMap, root };
  }

  return context;
}

let pool: WorkerPool | undefined;

export async function createLageService(
  cwd: string,
  abortController: AbortController,
  logger: Logger,
  maxWorkers?: number
): Promise<ILageService> {
  logger.info(`Server started with ${maxWorkers} workers`);

  pool = new WorkerPool({
    script: require.resolve("./singleTargetWorker.js"),
    maxWorkers,
  });

  abortController.signal.addEventListener("abort", () => {
    pool?.close();
  });

  return {
    async ping() {
      return { pong: true };
    },

    async runTarget(request) {
      const { config, targetGraph, dependencyMap, packageTree, root } = await initializeOnce(cwd, logger);

      const runners: TargetRunnerPickerOptions = {
        npmScript: {
          script: require.resolve("../run/runners/NpmScriptRunner.js"),
          options: {
            nodeOptions: request.nodeOptions,
            taskArgs: request.taskArgs,
            npmCmd: config.npmClient,
          },
        },
        worker: {
          script: require.resolve("../run/runners/WorkerRunner.js"),
          options: {
            taskArgs: request.taskArgs,
          },
        },
        noop: {
          script: require.resolve("../run/runners/NoOpRunner.js"),
          options: {},
        },
      };

      const id = getTargetId(request.packageName, request.task);

      if (!targetGraph.targets.has(id)) {
        logger.error(`Target not found: ${request.packageName}#${request.task}`);
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

      let pipedStdout: Readable;
      let pipedStderr: Readable;

      try {
        await pool!.exec(
          task,
          0,
          (worker, stdout, stderr) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} start`);
            pipedStdout = stdout;
            pipedStderr = stderr;
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
          },
          (worker) => {
            logger.info(`[${worker.threadId}] ${request.packageName}#${request.task} end`);
            pipedStdout.unpipe(process.stdout);
            pipedStderr.unpipe(process.stderr);
          }
        );

        const globalInputs = target.environmentGlob
          ? glob(target.environmentGlob, { cwd: root })
          : glob(config.cacheOptions?.environmentGlob, { cwd: root });
        const inputs = (getInputFiles(target, dependencyMap, packageTree) ?? []).concat(globalInputs);

        return {
          packageName: request.packageName,
          task: request.task,
          exitCode: 0,
          hash: "",
          inputs,
          outputs: getOutputFiles(target, config.cacheOptions?.outputGlob),
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
          id,
        };
      }
    },
  };
}
