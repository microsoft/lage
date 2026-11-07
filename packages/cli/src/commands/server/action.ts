import { getCacheDirectoryRoot } from "@lage-run/cache";
import { getConfig } from "@lage-run/config";
import { createLogger } from "@lage-run/logger";
import type { TargetLogger } from "@lage-run/reporters";
import { createServer, type LageServer } from "@lage-run/rpc";
import path from "path";
import { getWorkspaceManagerRoot } from "workspace-tools";
import { initializeReporters } from "../initializeReporters.js";
import { parseServerOption } from "../parseServerOption.js";
import type { ServerCommandOptions } from "./index.js";
import { createLageService } from "./lageService.js";

export async function serverAction(options: ServerCommandOptions): Promise<void> {
  const { server = "localhost:5332", timeout = 1, tasks } = options;

  if (!tasks?.length) {
    throw new Error("No tasks specified, this is required for when running in server mode");
  }

  const { host, port } = parseServerOption(server);
  const cwd = process.cwd();
  const root = getWorkspaceManagerRoot(cwd) ?? cwd;
  const config = await getConfig(cwd);

  const logger: TargetLogger = createLogger();
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
