import { AbortSignal } from "abort-controller";
import { fork } from "child_process";
import { getWorkspaceRoot } from "workspace-tools";
import { Logger, LogLevel } from "@lage-run/logger";
import path from "path";
import type { ChildProcess } from "child_process";
import type { Target, TargetConfig } from "@lage-run/target-graph";
import type { TargetCaptureStreams, TargetRunner } from "../types/TargetRunner";

export interface WorkerRunnerOptions {
  logger: Logger;
  workerTargetConfigs: Record<string, TargetConfig>;
  nodeOptions?: string;
}

export interface PoolOptions {
  id: string;
  options: Record<string, any>;
  script: string;
  nodeOptions: string;
}

/**
 * Creates a workerpool per target task definition of "type: worker"
 *
 * Target options are fed into `workerpool`, so target can customize the pool:
 *
 * https://www.npmjs.com/package/workerpool
 *
 * Example:
 *
 * ```ts
 * // lage.config.js
 * {
 *   pipeline: {
 *     "lint": {
 *       type: "worker",
 *       options: {
 *         worker: "workers/lint.js",
 *         maxWorkers: 15,
 *         minWorkers: 2,
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ```js
 * // worker.js
 * const { WorkerRunner } = require("@lage-run/scheduler");
 * WorkerRunner.register({
 * })
 * ```
 */
export class WorkerRunner implements TargetRunner {
  private poolProcesses: Record<string, ChildProcess> = {};
  static gracefulKillTimeout = 2500;

  constructor(private options: WorkerRunnerOptions) {}

  getPoolOptions(target: Target): PoolOptions {
    const { task } = target;
    const { workerTargetConfigs } = this.options;

    let id: string = "";
    let options: Record<string, any> = {};
    let script: string = "";

    if (workerTargetConfigs[target.id]) {
      id = target.id;
      script = workerTargetConfigs[target.id].options?.worker;
      options = workerTargetConfigs[target.id].options ?? {};
    } else if (workerTargetConfigs[task]) {
      id = task;
      script = workerTargetConfigs[task].options?.worker;
      options = workerTargetConfigs[task].options ?? {};
    }

    return {
      id,
      script,
      options,
      nodeOptions: workerTargetConfigs[id].options?.nodeOptions,
    };
  }

  createPoolProcess(poolOptions: PoolOptions, abortSignal?: AbortSignal) {
    const { logger, nodeOptions } = this.options;
    const { id, script, options } = poolOptions;

    const root = getWorkspaceRoot(process.cwd());

    let childProcess: ChildProcess;
    /**
     * Handling abort signal from the abort controller. Gracefully kills the process,
     * will be handled by exit handler separately to resolve the promise.
     */
    if (abortSignal) {
      if (abortSignal.aborted) {
        return;
      }

      const abortSignalHandler = () => {
        abortSignal.removeEventListener("abort", abortSignalHandler);
        if (childProcess && !childProcess.killed) {
          const pid = childProcess.pid;
          logger.verbose(`Abort signal detected, attempting to killing process id ${pid} for the worker pool: ${id}`);

          childProcess.kill("SIGTERM");

          // wait for "gracefulKillTimeout" to make sure everything is terminated via SIGKILL
          const t = setTimeout(() => {
            if (childProcess && !childProcess.killed) {
              childProcess.kill("SIGKILL");
            }
          }, WorkerRunner.gracefulKillTimeout);

          // Remember that even this timeout needs to be unref'ed, otherwise the process will hang due to this timeout
          if (t.unref) {
            t.unref();
          }
        }
      };

      abortSignal.addEventListener("abort", abortSignalHandler);
    }

    /**
     * Actually spawn the npm client to run the task
     */
    const workerProcessScript = path.join(path.dirname(__filename), "../../worker/workerProcess.js");
    const combinedNodeOptions = [nodeOptions, options.nodeOptions].filter((str) => str).join(" ");

    childProcess = fork(workerProcessScript, [id, script, JSON.stringify(options)], {
      cwd: root,
      stdio: ["inherit", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
        ...(combinedNodeOptions && { NODE_OPTIONS: combinedNodeOptions }),
      },
    });

    if (!childProcess) {
      throw new Error(`Failed to spawn child process for the worker pool: ${id}`);
    }

    // Handle exit
    let exitHandled = false;

    const handleChildProcessExit = (code: number, signal?: any) => {
      childProcess.off("exit", handleChildProcessExit);
      childProcess.off("error", handleChildProcessExit);

      if (exitHandled) {
        return;
      }

      exitHandled = true;

      childProcess.stdout?.destroy();
      childProcess.stderr?.destroy();
    };

    childProcess.on("exit", handleChildProcessExit);
    childProcess.on("error", () => handleChildProcessExit(1));

    return childProcess;
  }

  captureStream(target: Target, childProcess: ChildProcess, captureStreams: TargetCaptureStreams = {}) {
    const { logger } = this.options;
    const { pid } = childProcess;

    let stdout = childProcess.stdout;
    let stderr = childProcess.stderr;

    let releaseStreams = {
      stdout: () => {},
      stderr: () => {},
    };

    if (stdout) {
      if (captureStreams.stdout) {
        stdout = stdout.pipe(captureStreams.stdout);
      }

      releaseStreams.stdout = logger.stream(LogLevel.verbose, stdout, { target, pid });
    }

    if (stderr) {
      if (captureStreams.stderr) {
        stderr = stderr.pipe(captureStreams.stderr);
      }

      releaseStreams.stderr = logger.stream(LogLevel.verbose, stderr, { target, pid });
    }

    return () => {
      releaseStreams.stdout();
      releaseStreams.stderr();

      if (captureStreams.stdout && stdout) {
        stdout.unpipe(captureStreams.stdout);
      }

      if (captureStreams.stderr && stderr) {
        stderr.unpipe(captureStreams.stderr);
      }
    };
  }

  async run(target: Target, abortSignal?: AbortSignal, captureStreams: TargetCaptureStreams = {}) {
    const poolOptions = this.getPoolOptions(target);
    const { logger } = this.options;

    if (!this.poolProcesses[poolOptions.id]) {
      const proc = this.createPoolProcess(poolOptions, abortSignal);

      if (!proc) {
        // this happens when the abort signal is triggered
        return;
      }

      this.poolProcesses[poolOptions.id] = proc;
    }

    const childProcess = this.poolProcesses[poolOptions.id];

    if (!childProcess) {
      throw new Error(`Failed to find child process for the worker pool: ${poolOptions.id}`);
    }

    const releaseStreams = this.captureStream(target, childProcess, captureStreams);
    return new Promise<void>((resolve, reject) => {
      logger.verbose(`Sending message to worker pool: ${poolOptions.id} for target ${target.id}`, { target });

      childProcess.send({ type: "run", target });

      const messageHandler = (message: any) => {
        childProcess.off("message", messageHandler);

        if (message.type === "status") {
          logger.verbose(`Received message from worker pool: ${poolOptions.id} for target ${target.id} with status: ${message.status}`, {
            target,
          });

          releaseStreams();

          if (message.status === "success") {
            return resolve();
          }

          reject();
        }
      }

      childProcess.on("message", messageHandler);
    });
  }

  cleanup() {
    for (const poolProcess of Object.values(this.poolProcesses)) {
      poolProcess.send({ type: "cleanup" });
    }
  }
}
