import { TaskLogger } from "../logger/TaskLogger";
import { ChildProcess } from "child_process";
import { PackageInfo } from "workspace-tools";
import { findNpmClient } from "../workspace/findNpmClient";
// import { spawn } from "child_process";
import { controller } from "./abortSignal";
import path from "path";
// import { TaskLogWritable } from "../logger/TaskLogWritable";
import { cacheHash, cacheFetch, cachePut } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { hrToSeconds } from "../logger/reporters/formatDuration";
import { getNpmCommand } from "./getNpmCommand";
import { NpmClient } from "../types/ConfigOptions";
import { CacheOptions } from "../types/CacheOptions";
import { workerQueue } from "./workerQueue";
import { PackageTaskDeps } from "@microsoft/task-scheduler/lib/types";

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
    private context: RunContext,
    private taskDeps: PackageTaskDeps
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

  runScript() {
    const { info, logger, npmArgs } = this;
    const { npmCmd } = DistributedNpmScriptTask;
    
    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

      const job = workerQueue.createJob({
        npmCmd,
        npmArgs,
        name: info.name,
        task: this.task,
        packagePath: path.relative(this.root, path.dirname(info.packageJsonPath)),
        taskDeps: getTaskDepsForPackageTask(`${info.name}#${this.task}`, this.taskDeps),
        spawnOptions: {
            stdio: "pipe",
            env: {
              ...process.env,
              ...(process.stdout.isTTY &&
                this.config.reporter !== "json" && { FORCE_COLOR: "1" }),
              LAGE_PACKAGE_NAME: info.name,
            },
          }
      })

     
      job.on('succeeded', (result) => {
        resolve();
      })

      // times out at 1 hour
      job.timeout(1000 * 60 * 60).save();
    });
  }

  async run() {
    const { info, task, context, config, logger } = this;

    try {
      this.onStart();

      await context.profiler.run(
        () => this.runScript(),
        `${info.name}.${task}`
      );

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


function getTaskDepsForPackageTask(packageTask: string, taskDeps: PackageTaskDeps) {
  const stack = [packageTask];
  const deps = new Set<string>();
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (current !== packageTask) {
      deps.add(current);
    }

    taskDeps.forEach(([from, to]) => {
      if (to === current) {
        stack.push(from);
      }
    })
  }

  return [...deps];
}