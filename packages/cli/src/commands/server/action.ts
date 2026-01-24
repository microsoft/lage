import createLogger, { type Logger } from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { createLageService } from "./lageService.js";
import { createServer } from "@lage-run/rpc";
import { parseServerOption } from "../parseServerOption.js";
import { getConfig } from "@lage-run/config";

interface WorkerOptions extends ReporterInitOptions {
  nodeArg?: string[];
  server?: string;
  timeout?: number;
  shutdown: boolean;
  tasks: string[];
}

export async function serverAction(options: WorkerOptions): Promise<void> {
  const { server = "localhost:5332", timeout = 1, tasks } = options;

  const { host, port } = parseServerOption(server);
  const cwd = process.cwd();
  const config = await getConfig(cwd);

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.logFile = options.logFile ?? "node_modules/.cache/lage/server.log";
  options.reporter = options.reporter ?? "verboseFileLog";
  await initializeReporters(logger, options, config.reporters);

  logger.info(`Starting server on http://${host}:${port}`);

  const abortController = new AbortController();

  const lageService = await createLageService({
    cwd: process.cwd(),
    serverControls: {
      abortController,
      countdownToShutdown: () => resetTimer(logger, timeout, abortController, lageServer),
      clearCountdown: clearTimer,
    },
    logger,
    concurrency: options.concurrency,
    tasks,
  });
  const lageServer = await createServer(lageService, abortController);

  await lageServer.listen({ host, port });
  logger.info(`Server listening on http://${host}:${port}, timeout in ${timeout} seconds`);
}

let timeoutHandle: NodeJS.Timeout | undefined;
function resetTimer(logger: Logger, timeout: number, abortController: AbortController, server: any) {
  clearTimer();

  timeoutHandle = globalThis.setTimeout(() => {
    logger.info(`Server timed out after ${timeout} seconds`);
    abortController.abort();
    server.close();
  }, timeout * 1000);
}

function clearTimer() {
  if (timeoutHandle) {
    globalThis.clearTimeout(timeoutHandle);
  }
}
