import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { PackageInfo } from "workspace-tools";
import { findNpmClient } from "../workspace/findNpmClient";
import { spawn } from "child_process";
import { controller } from "./abortSignal";
import path from "path";
import { TaskLogWritable } from "../logger/TaskLogWritable";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";
import { getNpmCommand } from "./getNpmCommand";
import { NpmClient } from "../types/ConfigOptions";
import { CacheOptions } from "../types/CacheOptions";
import { QueueSettings } from "bee-queue";

export type NpmScriptTaskStatus =
  | "completed"
  | "failed"
  | "pending"
  | "started"
  | "skipped";

export interface NpmScriptTaskConfig {
  npmClient: NpmClient;
  reporter: string;
  cacheOptions: CacheOptions;
  cache: boolean;
  resetCache: boolean;
  continueOnError: boolean;
  safeExit: boolean;
  nodeArgs: string[];
  passThroughArgs: string[];
  workerQueueOptions: QueueSettings;
}

export class NpmScriptTask {
  static npmCmd: string = "";
  static activeProcesses = new Set<ChildProcess>();
  static gracefulKillTimeout = 2500;

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  status: NpmScriptTaskStatus;
  logger: TaskLogger;

  static killAllActiveProcesses() {
    // first, send SIGTERM everywhere
    for (const cp of NpmScriptTask.activeProcesses) {
      cp.kill("SIGTERM");
    }

    // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
    setTimeout(() => {
      for (const cp of NpmScriptTask.activeProcesses) {
        if (!cp.killed) {
          cp.kill("SIGKILL");
        }
      }
    }, NpmScriptTask.gracefulKillTimeout);
  }

  constructor(
    public task: string,
    private root: string,
    public info: PackageInfo,
    private config: NpmScriptTaskConfig,
    private context: RunContext
  ) {
    NpmScriptTask.npmCmd =
      NpmScriptTask.npmCmd || findNpmClient(config.npmClient);
    this.status = "pending";
    this.logger = new TaskLogger(info.name, task);

    this.npmArgs = getNpmCommand(config.nodeArgs, config.passThroughArgs, task);
  }

  onStart() {
    this.status = "started";
    this.startTime = process.hrtime();
    this.logger.info("started", { status: "started" });
  }

  onComplete() {
    this.status = "completed";
    this.duration = process.hrtime(this.startTime);
    this.logger.info("completed", {
      status: "completed",
      duration: hrToSeconds(this.duration),
    });
  }

  onFail() {
    this.status = "failed";
    this.duration = process.hrtime(this.startTime);
    this.logger.info("failed", {
      status: "failed",
      duration: hrToSeconds(this.duration),
    });
  }

  onSkipped(hash: string | null) {
    this.status = "skipped";
    this.duration = process.hrtime(this.startTime);
    this.logger.info(`skipped`, {
      status: "skipped",
      duration: hrToSeconds(this.duration),
      hash,
    });
  }

  async getCache() {
    let hash: string | null = null;
    let cacheHit = false;

    const { task, info, root, config } = this;

    const name = info.name;
    const packagePath = path.dirname(info.packageJsonPath);

    if (config.cache) {
      hash = await cacheHash(
        task,
        name,
        root,
        packagePath,
        config.cacheOptions,
        config.passThroughArgs
      );

      if (hash && !config.resetCache) {
        cacheHit = await cacheFetch(hash, task, name, packagePath, config.cacheOptions);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, info, config, root } = this;

    const packagePath = path.relative(root, path.dirname(info.packageJsonPath));

    logger.verbose(`hash put ${hash}`);
    await cachePut(hash, packagePath, config.cacheOptions);
  }

  runScript() {
    const { info, logger, npmArgs } = this;
    const { npmCmd } = NpmScriptTask;

    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

      const cp = spawn(npmCmd, npmArgs, {
        cwd: path.dirname(info.packageJsonPath),
        stdio: "pipe",
        env: {
          ...process.env,
          ...(process.stdout.isTTY &&
            this.config.reporter !== "json" && { FORCE_COLOR: "1" }),
          LAGE_PACKAGE_NAME: info.name,
        },
      });

      NpmScriptTask.activeProcesses.add(cp);

      const stdoutLogger = new TaskLogWritable(this.logger);
      cp.stdout.pipe(stdoutLogger);

      const stderrLogger = new TaskLogWritable(this.logger);
      cp.stderr.pipe(stderrLogger);

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          NpmScriptTask.activeProcesses.delete(cp);
          return resolve();
        }

        cp.stdout.destroy();
        cp.stdin.destroy();
        reject();
      }
    });
  }

  async run() {
    const { info, task, context, config, logger } = this;

    try {
      const { hash, cacheHit } = await this.getCache();

      const cacheEnabled = config.cache && hash;

      this.onStart();

      // skip if cache hit!
      if (cacheHit) {
        this.onSkipped(hash);
        return true;
      }

      if (cacheEnabled) {
        logger.verbose(`hash: ${hash}, cache hit? ${cacheHit}`);
      }

      await context.profiler.run(
        () => this.runScript(),
        `${info.name}.${task}`
      );

      if (cacheEnabled) {
        await this.saveCache(hash);
      }

      this.onComplete();
    } catch (e) {
      context.measures.failedTasks = context.measures.failedTasks || [];
      context.measures.failedTasks.push({ pkg: info.name, task });
      this.onFail();

      if (config.continueOnError) {
        return true;
      }

      if (!config.safeExit) {
        controller.abort();
      }
      return false;
    }

    return true;
  }
}
