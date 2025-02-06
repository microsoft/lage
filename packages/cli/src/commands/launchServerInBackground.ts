import type { Logger } from "@lage-run/logger";
import fs from "fs";
import path from "path";
import lockfile from "proper-lockfile";
import execa from "execa";
import { getBinScripts } from "../getBinPaths.js";

export interface launchServerInBackgroundOptions {
  logger: Logger;
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
}: launchServerInBackgroundOptions): Promise<void> {
  const lockfilePath = path.join(root, `node_modules/.cache/lage/.lage-server-${host}-${port}.pid`);

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
  const isServerRunning = pid && isAlive(pid);
  logger.info("Checking if server is already running", { pid, isServerRunning });
  if (pid && isServerRunning) {
    logger.info("Server already running", { pid });
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

    if (child && child.pid) {
      fs.writeFileSync(lockfilePath, child.pid.toString());
    }

    child.unref();
    logger.info("Server started", { pid: child.pid });
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
