import type { Command } from "commander";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { executeInProcess } from "./executeInProcess.js";
import { executeRemotely } from "./executeRemotely.js";

interface ExecOptions extends ReporterInitOptions {
  cwd?: string;
  server?: boolean | string;
  timeout?: number;
  nodeArg?: string;
}

export async function execAction(options: ExecOptions, command: Command) {
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  const { server } = options;
  if (server) {
    logger.info("Running in server mode");
    await executeRemotely(options, command);
  } else {
    await executeInProcess({ logger, args: command.args, cwd: options.cwd, nodeArg: options.nodeArg });
  }
}
