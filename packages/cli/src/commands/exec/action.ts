import type { Command } from "commander";
import createLogger from "@lage-run/logger";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";
import { initializeReporters } from "../initializeReporters.js";
import { executeInProcess } from "./executeInProcess.js";
import { executeRemotely } from "./executeRemotely.js";
import { getConfig } from "@lage-run/config";

interface ExecOptions extends ReporterInitOptions {
  cwd?: string;
  server?: boolean | string;
  timeout?: number;
  nodeArg?: string;
  tasks?: string[];
}

interface ExecRemoteOptions extends ExecOptions {
  tasks: string[];
}

export async function execAction(options: ExecOptions, command: Command) {
  const cwd = options.cwd ?? process.cwd();
  const config = await getConfig(cwd);
  const logger = createLogger();
  options.cwd = cwd;
  options.logLevel = options.logLevel ?? "info";
  options.reporter = options.reporter ?? "json";
  await initializeReporters(logger, options, config.reporters);

  const { server } = options;
  if (server) {
    logger.info("Running in server mode");

    if (typeof options.tasks === "undefined") {
      throw new Error("No tasks specified, this is required for when running in server mode");
    }

    await executeRemotely(options as ExecRemoteOptions, command);
  } else {
    await executeInProcess({ logger, args: command.args, cwd: options.cwd, nodeArg: options.nodeArg });
  }
}
