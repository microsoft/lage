import { Config } from "../types/Config";
import { findNpmClient } from "../workspace/findNpmClient";
import { PackageInfo } from "workspace-tools";
import { RunContext } from "../types/RunContext";
import { spawn, ChildProcess } from "child_process";
import { taskLogger, NpmLogWritable } from "../logger";
import { taskWrapper } from "./taskWrapper";
import path from "path";
import PQueue from "p-queue";

let npmCmd: string;
let queue: PQueue;
let bail = false;
let activeProcesses = new Set<ChildProcess>();

export function npmTask(
  task: string,
  info: PackageInfo,
  config: Config,
  context: RunContext,
  root: string
) {
  const { node, args, npmClient, concurrency } = config;

  const logger = taskLogger(info.name, task);

  // cached npmCmd
  queue = queue || new PQueue({ concurrency });
  npmCmd = npmCmd || findNpmClient(npmClient);

  const npmArgs = [...node, "run", task, "--", ...args];

  if (bail) {
    return Promise.reject();
  }

  return queue.add(() =>
    taskWrapper(
      info,
      task,
      () =>
        new Promise((resolve, reject) => {
          if (!info.scripts || !info.scripts![task]) {
            logger.info(`Empty script detected, skipping`);
            return resolve();
          }

          logger.verbose(`Running ${[npmCmd, ...npmArgs].join(" ")}`);

          const cp = spawn(npmCmd, npmArgs, {
            cwd: path.dirname(info.packageJsonPath),
            stdio: "pipe",
            env: {
              ...process.env,
              ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
            },
          });

          activeProcesses.add(cp);

          const stdoutLogger = new NpmLogWritable(info.name, task);
          cp.stdout.pipe(stdoutLogger);

          const stderrLogger = new NpmLogWritable(info.name, task);
          cp.stderr.pipe(stderrLogger);

          cp.on("exit", handleChildProcessExit);

          function handleChildProcessExit(code: number) {
            if (code === 0) {
              activeProcesses.delete(cp);
              return resolve();
            }

            bail = true;
            cp.stdout.destroy();
            cp.stdin.destroy();
            reject();
          }
        }),
      config,
      context,
      root
    )
  );
}

export function killAllActiveProcesses() {
  for (const cp of activeProcesses) {
    cp.kill("SIGKILL");
  }
}
