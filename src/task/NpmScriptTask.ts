import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { PackageInfo } from "workspace-tools";
import { Config } from "../types/Config";
import { findNpmClient } from "../workspace/findNpmClient";
import { spawn } from "child_process";
import { controller } from "./abortSignal";
import path from "path";
import { TaskLogWritable } from "../logger/TaskLogWritable";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";

export type NpmScriptTaskStatus =
  | "completed"
  | "failed"
  | "pending"
  | "started"
  | "skipped";

export class NpmScriptTask {
  static npmCmd: string = "";
  static bail = false;
  static activeProcesses = new Set<ChildProcess>();

  npmArgs: string[] = [];
  startTime: [number, number] = [0, 0];
  duration: [number, number] = [0, 0];
  status: NpmScriptTaskStatus;
  logger: TaskLogger;

  static killAllActiveProcesses() {
    for (const cp of NpmScriptTask.activeProcesses) {
      cp.kill("SIGKILL");
    }
  }

  constructor(
    public task: string,
    private root: string,
    public info: PackageInfo,
    private config: Config,
    private context: RunContext
  ) {
    NpmScriptTask.npmCmd =
      NpmScriptTask.npmCmd || findNpmClient(config.npmClient);
    this.status = "pending";
    this.logger = new TaskLogger(info.name, task);

    const { node, args } = config;
    this.npmArgs = [...node, "run", task, "--", ...args];
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
      duration: "0",
      hash,
    });
  }

  async getCache() {
    let hash: string | null = null;
    let cacheHit = false;

    const { task, info, root, config } = this;

    if (config.cache) {
      hash = await cacheHash(task, info, root, config);

      if (hash && !config.resetCache) {
        cacheHit = await cacheFetch(hash, info, config);
      }
    }

    return { hash, cacheHit };
  }

  async saveCache(hash: string | null) {
    const { logger, info, config } = this;
    logger.verbose(`hash put ${hash}`);
    await cachePut(hash, info, config);
  }

  runScript() {
    const { info, logger, npmArgs } = this;
    const { npmCmd } = NpmScriptTask;

    return new Promise((resolve, reject) => {
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

        NpmScriptTask.bail = true;
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

      // skip if cache hit!
      if (cacheHit) {
        this.onSkipped(hash);
        return true;
      }

      this.onStart();

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
      context.measures.failedTask = { pkg: info.name, task };
      controller.abort();
      this.onFail();
      return false;
    }

    return true;
  }
}
