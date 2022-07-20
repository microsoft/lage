import { Target } from "../types/Target";
import { Logger, LogLevel } from "@lage-run/logger";
import { spawn } from "child_process";
import { findNpmClient } from "./findNpmClient";
import path from "path";

interface NpmScriptRunnerLogData {
  packageName: string;
  task: string;
}

function getNpmCommand(npmClient: string, nodeArgs: string[], passThroughArgs: string[], task: string) {
  const npmCmd = findNpmClient(npmClient);
  const extraArgs = passThroughArgs.length > 0 ? ["--", ...passThroughArgs] : [];
  return { cmd: npmCmd, args: [...nodeArgs, "run", task, ...extraArgs] };
}

// TODO: next step - how to run a npm script?
export async function npmScriptRunner(target: Target) {
  // TODO: fix this npm cmd & args

  const npmCmd = "npm";
  const npmArgs = ["run", target.task];
  const logger = new Logger();

  const runPromise = new Promise<void>((resolve, reject) => {
    const cp = spawn(npmCmd, npmArgs, {
      cwd: target.cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        ...(process.stdout.isTTY && { FORCE_COLOR: "1" }),
        LAGE_PACKAGE_NAME: target.packageName,
      },
    });

    // TODO: register to a process manager
    // NpmScriptTask.activeProcesses.add(cp);

    logger.stream(LogLevel.verbose, cp.stdout, { packageName: target.packageName, task: target.task });
    logger.stream(LogLevel.verbose, cp.stderr, { packageName: target.packageName, task: target.task });
    
    cp.on("exit", handleChildProcessExit);

    function handleChildProcessExit(code: number) {
      if (code === 0) {
        // TODO: unregister from a process manager
        // NpmScriptTask.activeProcesses.delete(cp);
        
        return resolve();
      }

      cp.stdout.destroy();
      cp.stdin.destroy();
      reject();
    }
  });
}
