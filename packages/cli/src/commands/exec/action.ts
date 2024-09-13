import type { Command } from "commander";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { executeInProcess } from "./executeInProcess.js";

interface ExecOptions extends ReporterInitOptions {
  cwd?: string;
  server?: string | boolean;
  nodeArg?: string[];
}

export async function execAction(options: ExecOptions, command: Command) {
  const logger = createLogger();
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  initializeReporters(logger, options);

  await executeInProcess({ logger, args: command.args, cwd: options.cwd, nodeArg: options.nodeArg });
}
