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

interface ExecRemotelyOptions extends ReporterInitOptions {
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

  const response = await client.runTarget({
    packageName,
    task,
    taskArgs,
  });

  logger.info(`Task ${response.packageName} ${response.task} exited with code ${response.exitCode} `);

  return response;
}

export async function executeRemotely(options: ExecRemotelyOptions, command) {
  // launch a 'lage-server.js' process, detached if it is not already running
  // send the command to the server process
  const { server = "localhost:5332" } = options;
  const timeout = options.timeout ?? 120;

  const serverString =
    typeof options.server === "boolean" && options.server ? "localhost:5332" : !server ? "localhost:5332" : (server as string);

  const parts = serverString.split(":");
  const host = parts[0];
  const port = parseInt(parts[1] ?? "5332");

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  let client = await tryCreateClient(host, port);
  const args = command.args;

  if (!client) {
    logger.info(`Starting server on http://${host}:${port}`);

    const binPaths = getBinPaths();
    const lageServerBinPath = binPaths["lage-server"];
    const lageServerArgs = [lageServerBinPath, "--host", host, "--port", port, "--timeout", timeout, ...args];

    logger.info(`Launching lage-server with these parameters: "${process.execPath}" ${lageServerArgs.join(" ")}`);
    const child = execa(process.execPath, lageServerArgs, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    logger.info("Server started", { pid: child.pid });

    logger.info("Creating a client to connect to the background services");
    client = await tryCreateClientWithRetries(host, port, logger);

    if (!client) {
      throw new Error("Server could not be started");
    }
  }

  logger.info(`Executing on server http://${host}:${port}`);
  const response = await executeOnServer(args, client, logger);

  process.stdout.write(response.stdout);
  process.stderr.write(response.stderr);
  process.exitCode = response.exitCode;

  if (response.exitCode === 0) {
    await simulateFileAccess(logger, response.inputs, response.outputs);
  }

  logger.info("Task execution finished");
}
