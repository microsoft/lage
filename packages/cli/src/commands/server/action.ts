import { createLogger } from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { createLageService } from "./lageService.js";
import { createServer, type LageServer } from "@lage-run/rpc";
import { parseServerOption } from "../parseServerOption.js";
import { getConfig } from "@lage-run/config";
import { getWorkspaceManagerRoot } from "workspace-tools";
import path from "path";
import { getCacheDirectoryRoot } from "@lage-run/cache";
import type { TargetLogger } from "@lage-run/reporters";

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
  const root = getWorkspaceManagerRoot(cwd) ?? cwd;
  const config = await getConfig(cwd);

  const logger: TargetLogger = createLogger();
  options.logLevel ??= "info";
  options.logFile ??= path.join(getCacheDirectoryRoot(root), "server.log");
  await initializeReporters({ logger, options, config, root, defaultReporter: "verboseFileLog" });

  logger.info(`Starting server on http://${host}:${port}`);

  const abortController = new AbortController();

  const lageService = createLageService({
    cwd,
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
function resetTimer(logger: TargetLogger, timeout: number, abortController: AbortController, server: LageServer) {
  clearTimer();

  timeoutHandle = globalThis.setTimeout(() => {
    logger.info(`Server timed out after ${timeout} seconds`);
    abortController.abort();
    void server.close();
  }, timeout * 1000);
}

function clearTimer() {
  if (timeoutHandle) {
    globalThis.clearTimeout(timeoutHandle);
  }
}
