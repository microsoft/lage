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
}

export class DistributedNpmScriptTask {
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
    for (const cp of DistributedNpmScriptTask.activeProcesses) {
      cp.kill("SIGTERM");
    }

    // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
    setTimeout(() => {
      for (const cp of DistributedNpmScriptTask.activeProcesses) {
        if (!cp.killed) {
          cp.kill("SIGKILL");
        }
      }
    }, DistributedNpmScriptTask.gracefulKillTimeout);
  }

  constructor(
    public task: string,
    private root: string,
    public info: PackageInfo,
    private config: NpmScriptTaskConfig,
    private context: RunContext
  ) {
    DistributedNpmScriptTask.npmCmd =
    DistributedNpmScriptTask.npmCmd || findNpmClient(config.npmClient);
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

    if (config.cache) {
      hash = await cacheHash(
        task,
        info,
        root,
        config.cacheOptions,
        config.passThroughArgs
      );

      if (hash && !config.resetCache) {
        cacheHit = await cacheFetch(hash, info, config.cacheOptions);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, info, config } = this;
    logger.verbose(`hash put ${hash}`);
    await cachePut(hash, info, config.cacheOptions);
  }

  runScript() {
    const { info, logger, npmArgs } = this;
    const { npmCmd } = DistributedNpmScriptTask;

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

      DistributedNpmScriptTask.activeProcesses.add(cp);

      const stdoutLogger = new TaskLogWritable(this.logger);
      cp.stdout.pipe(stdoutLogger);

      const stderrLogger = new TaskLogWritable(this.logger);
      cp.stderr.pipe(stderrLogger);

      cp.on("exit", handleChildProcessExit);

      function handleChildProcessExit(code: number) {
        if (code === 0) {
          DistributedNpmScriptTask.activeProcesses.delete(cp);
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
