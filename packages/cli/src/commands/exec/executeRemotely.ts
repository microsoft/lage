import type { Logger } from "@lage-run/logger";
import createLogger from "@lage-run/logger";
import { initializeReporters } from "../initializeReporters.js";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import type { LageClient } from "@lage-run/rpc";
import { ConnectError, createClient } from "@lage-run/rpc";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { simulateFileAccess } from "./simulateFileAccess.js";
import { parseServerOption } from "../parseServerOption.js";
import { getWorkspaceRoot } from "workspace-tools";
import type { Command } from "commander";
import { launchServerInBackground } from "../launchServerInBackground.js";

interface ExecRemotelyOptions extends ReporterInitOptions {
  cwd?: string;
  server?: string | boolean;
  timeout?: number;
  tasks: string[];
  nodeArg?: string;
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
      logger.info(JSON.stringify(e));

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
    logger.info(`Running task ${packageName} ${task}`);
    const response = await client.runTarget({
      packageName,
      task,
      taskArgs,
    });
    logger.info(`Task ${response.packageName} ${response.task} exited with code ${response.exitCode}`);
    return response;
  } catch (error) {
    if (error instanceof ConnectError) {
      logger.error("Error connecting to server", { error });
    } else {
      logger.error("Error running task", { error });
    }
  }
}

export async function executeRemotely(options: ExecRemotelyOptions, command: Command) {
  // launch a 'lage-server.js' process, detached if it is not already running
  // send the command to the server process
  const { server, tasks, nodeArg } = options;
  const timeout = options.timeout ?? 5 * 60;

  const { host, port } = parseServerOption(server);

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const root = getWorkspaceRoot(options.cwd ?? process.cwd())!;

  let client = await tryCreateClient(host, port);
  const args = command.args;

  logger.info(`Command args ${command.args.join(" ")}`);

  if (!client) {
    await launchServerInBackground({
      host,
      port,
      tasks,
      args,
      timeout,
      logger,
      root,
      nodeArg,
    });

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

    // we will simulate file access even if exit code may be non-zero
    await simulateFileAccess(logger, [...response.inputs, ...response.globalInputs], response.outputs);
  } else {
    process.exitCode = 1;
  }

  logger.info("Task execution finished");
}
