import type { Logger } from "@lage-run/logger";
import createLogger from "@lage-run/logger";
import { initializeReporters } from "../initializeReporters.js";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { LageClient } from "@lage-run/rpc";
import { ConnectError, createClient } from "@lage-run/rpc";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { simulateFileAccess } from "./simulateFileAccess.js";
import execa from "execa";
import { getBinPaths } from "../../getBinPaths.js";
import { parseServerOption } from "../parseServerOption.js";
import lockfile from "proper-lockfile";
import path from "path";
import fs from "fs";
import { getWorkspaceRoot } from "workspace-tools";

interface ExecRemotelyOptions extends ReporterInitOptions {
  cwd?: string;
  server?: string | boolean;
  timeout?: number;
}

async function tryCreateClient(host: string, port: number) {
  const client = createClient({
    baseUrl: `http://${host}:${port}`,
    httpVersion: "2",
  });

  try {
    const success = await client.ping({});
    if (success.pong) {
      return client;
    }
  } catch (e) {
    if (e instanceof ConnectError) {
      return undefined;
    }

    throw e;
  }

  return undefined;
}

async function tryCreateClientWithRetries(host: string, port: number, logger: Logger) {
  let client: ReturnType<typeof createClient> | undefined;

  const start = Date.now();
  while (Date.now() - start < 5 * 1000) {
    try {
      client = await tryCreateClient(host, port);

      if (client) {
        return client;
      }
    } catch (e) {
      if (e instanceof ConnectError) {
        logger.error("Error connecting to server", e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return undefined;
}

async function executeOnServer(args: string[], client: LageClient, logger: Logger) {
  const task = args.length === 1 ? args[0] : args[1];
  const packageName = args.length > 1 ? args[0] : undefined;

  if (!task) {
    throw new Error("No task provided");
  }

  const { taskArgs } = filterArgsForTasks(args ?? []);

  try {
    const response = await client.runTarget({
      packageName,
      task,
      taskArgs,
    });
    logger.info(`Task ${response.packageName} ${response.task} exited with code ${response.exitCode} `);
    return response;
  } catch (error) {
    if (error instanceof ConnectError) {
      logger.error("Error connecting to server", { error });
    } else {
      logger.error("Error running task", { error });
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

export async function executeRemotely(options: ExecRemotelyOptions, command) {
  // launch a 'lage-server.js' process, detached if it is not already running
  // send the command to the server process
  const { server } = options;
  const timeout = options.timeout ?? 120;

  const { host, port } = parseServerOption(server);

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const root = getWorkspaceRoot(options.cwd ?? process.cwd())!;

  const lockfilePath = path.join(root, `node_modules/.cache/lage/.lage-server-${host}-${port}.pid`);

  let client = await tryCreateClient(host, port);
  const args = command.args;

  if (!client) {
    logger.info(`Starting server on http://${host}:${port}`);
    logger.info(`acquiring lock: ${lockfilePath}`);

    ensurePidFile(lockfilePath);

    const releaseLock = lockfile.lockSync(lockfilePath, {
      stale: 1000 * 60 * 1,
      // retries: {
      //   retries: 10,
      //   factor: 3,
      //   minTimeout: 0.5 * 1000,
      //   maxTimeout: 60 * 1000,
      //   randomize: true,
      // },
    });

    const pid = parseInt(fs.readFileSync(lockfilePath, "utf-8"));
    const isServerRunning = pid && isAlive(pid);
    logger.info("Checking if server is already running", { pid, isServerRunning });
    if (pid && isServerRunning) {
      logger.info("Server already running", { pid });
    } else {
      const binPaths = getBinPaths();
      const lageServerBinPath = binPaths["lage-server"];
      const lageServerArgs = ["--host", host, "--port", port, "--timeout", timeout, ...args];

      logger.info(`Launching lage-server with these parameters: ${lageServerArgs.join(" ")}`);
      const child = execa(lageServerBinPath, lageServerArgs, {
        cwd: root,
        detached: true,
        stdio: "ignore",
      });

      if (child && child.pid) {
        fs.writeFileSync(lockfilePath, child.pid.toString());
      }

      child.unref();
      logger.info("Server started", { pid: child.pid });
    }

    releaseLock();

    logger.info("Creating a client to connect to the background services");
    client = await tryCreateClientWithRetries(host, port, logger);

    if (!client) {
      throw new Error("Server could not be started");
    }
  }

  logger.info(`Executing on server http://${host}:${port}`);
  const response = await executeOnServer(args, client, logger);

  if (response) {
    process.stdout.write(response.stdout);
    process.stderr.write(response.stderr);
    process.exitCode = response.exitCode;

    if (response.exitCode === 0) {
      await simulateFileAccess(logger, response.inputs, response.outputs);
    }
  } else {
    process.exitCode = 1;
  }

  logger.info("Task execution finished");
}
