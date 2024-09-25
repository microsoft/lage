import createLogger, { type Logger } from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { createLageService } from "./lageService.js";
import type { Command } from "commander";
import type { LageClient } from "@lage-run/rpc";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { ConnectError, createClient, createServer } from "@lage-run/rpc";
import { simulateFileAccess } from "./simulateFileAccess.js";

interface WorkerOptions extends ReporterInitOptions {
  nodeArg?: string[];
  port?: number;
  host?: string;
  timeout?: number;
  shutdown: boolean;
}

async function tryCreateClient(host: string, port: number) {
  const client = createClient({
    baseUrl: `http://${host}:${port}`,
    httpVersion: "1.1",
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

  logger.info(`Task ${response.packageName} #${response.task} exited with code ${response.exitCode} `);

  process.exitCode = response.exitCode;

  if (response.exitCode === 0) {
    await simulateFileAccess(logger, response);
  }
}

export async function serverAction(options: WorkerOptions, command: Command) {
  const { port = 5332, host = "localhost", timeout = 1 } = options;

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const client = await tryCreateClient(host, port);

  if (client) {
    logger.info(`Executing on server http://${host}:${port}`);

    const args = command.args;
    await executeOnServer(args, client, logger);
  } else {
    logger.info(`Starting server on http://${host}:${port}`);

    const abortController = new AbortController();

    const lageService = await createLageService(process.cwd(), abortController, logger, options.concurrency);
    const server = await createServer(lageService, abortController);

    server.addHook("onRequest", (req, res, next) => {
      resetTimer(logger, timeout, abortController, server);
      next();
    });

    await server.listen({ host, port });
    logger.info(`Server listening on http://${host}:${port}, timeout in ${timeout} seconds`);

    const client = await tryCreateClient(host, port);

    if (!client) {
      throw new Error("Server could not be reached");
    }

    const args = command.args;
    await executeOnServer(args, client, logger);
  }
}

let timeoutHandle: NodeJS.Timeout | undefined;
function resetTimer(logger: Logger, timeout: number, abortController: AbortController, server: any) {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  timeoutHandle = setTimeout(() => {
    logger.info(`Server timed out after ${timeout} seconds`);
    abortController.abort();
    server.close();
  }, timeout * 1000);
}
