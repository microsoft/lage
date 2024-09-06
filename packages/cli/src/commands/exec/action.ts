import type { Command } from "commander";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { executeInProcess } from "./executeInProcess.js";
import { executeRemotely } from "./executeRemotely.js";

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

  if (options.server) {
    await executeRemotely({ server: typeof options.server === "boolean" ? "localhost:5332" : options.server, logger, args: command.args });
  } else {
    await executeInProcess({ logger, args: command.args, cwd: options.cwd, nodeArg: options.nodeArg });
  }
}
