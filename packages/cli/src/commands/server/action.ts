import createLogger, { type Logger } from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { createLageService } from "./lageService.js";
import { createServer } from "@lage-run/rpc";

interface WorkerOptions extends ReporterInitOptions {
  nodeArg?: string[];
  port?: number;
  host?: string;
  timeout?: number;
  shutdown: boolean;
}

export async function serverAction(options: WorkerOptions) {
  const { port = 5332, host = "localhost", timeout = 1 } = options;

  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  logger.info(`Starting server on http://${host}:${port}`);

  const abortController = new AbortController();

  const lageService = await createLageService({
    cwd: process.cwd(),
    serverControls: {
      abortController,
      countdownToShutdown: () => resetTimer(logger, timeout, abortController, server),
      clearCountdown: clearTimer,
    },
    logger,
    maxWorkers: options.concurrency,
  });
  const server = await createServer(lageService, abortController);

  await server.listen({ host, port });
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
