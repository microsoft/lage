import type { TargetLogger } from "@lage-run/reporters";
import fs from "fs";
import path from "path";
import lockfile from "proper-lockfile";
import execa from "execa";
import { getBinScripts } from "../getBinPaths.js";
import { getCacheDirectoryRoot } from "@lage-run/cache";
import type { LageServiceLogData } from "../types/LageServiceLogData.js";

export interface LaunchServerInBackgroundOptions {
  logger: TargetLogger;
  root: string;
  host: string;
  port: number;
  tasks: string[];
  timeout: number;
  args: string[];
  nodeArg?: string;
}

export async function launchServerInBackground({
  logger,
  root,
  host,
  port,
  tasks,
  timeout,
  args,
  nodeArg,
}: LaunchServerInBackgroundOptions): Promise<void> {
  const lockfilePath = path.join(getCacheDirectoryRoot(root), `.lage-server-${host}-${port}.pid`);

  logger.info(`Starting server on http://${host}:${port}`);
  logger.info(`acquiring lock: ${lockfilePath}`);

  ensurePidFile(lockfilePath);

  const releaseLock = await lockfile.lock(lockfilePath, {
    stale: 1000 * 60 * 1,
    retries: {
      retries: 10,
      factor: 3,
      minTimeout: 0.5 * 1000,
      maxTimeout: 60 * 1000,
      randomize: true,
    },
  });

  const pid = parseInt(fs.readFileSync(lockfilePath, "utf-8"));
  const isServerRunning = !!pid && isAlive(pid);
  logger.info("Checking if server is already running", undefined, { pid, isServerRunning } satisfies LageServiceLogData);
  if (pid && isServerRunning) {
    logger.info("Server already running", undefined, { pid } satisfies LageServiceLogData);
  } else {
    const binScripts = getBinScripts();

    const lageServerBinPath = binScripts["lage-server"];
    const lageServerArgs = [
      ...(nodeArg ? ["--node-arg", nodeArg] : []),
      lageServerBinPath,
      "--tasks",
      ...tasks,
      "--server",
      `${host}:${port}`,
      "--timeout",
      `${timeout}`,
      ...args,
    ];

    logger.info(`Launching lage-server with these parameters: ${lageServerArgs.join(" ")}`);
    const child = execa("node", lageServerArgs, {
      cwd: root,
      detached: true,
      stdio: "ignore",
      maxBuffer: 1024 * 1024 * 100,
    });

    if (child.pid) {
      fs.writeFileSync(lockfilePath, child.pid.toString());
    }

    child.unref();
    logger.info("Server started", undefined, { pid: child.pid } satisfies LageServiceLogData);
  }

  await releaseLock();
}

function ensurePidFile(lockfilePath: string) {
  if (!fs.existsSync(path.dirname(lockfilePath))) {
    fs.mkdirSync(path.dirname(lockfilePath), { recursive: true });
  }

  if (!fs.existsSync(lockfilePath)) {
    try {
      const fd = fs.openSync(lockfilePath, "w");
      fs.closeSync(fd);
    } catch {
      // ignore
    }
  }
}

function isAlive(pid: number) {
  try {
    return process.kill(pid, 0);
  } catch {
    return false;
  }
}
