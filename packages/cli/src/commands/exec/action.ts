import { getConcurrency, getConfig } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import type { Command } from "commander";
import { getWorkspaceManagerRoot } from "workspace-tools";
import { initializeReporters } from "../initializeReporters.js";
import { executeInProcess } from "./executeInProcess.js";
import { executeRemotely } from "./executeRemotely.js";
import type { ExecCommandOptions } from "./index.js";

export async function execAction(options: ExecCommandOptions, command: Command): Promise<void> {
  const cwd = process.cwd();
  const root = getWorkspaceManagerRoot(cwd) ?? cwd;
  const config = await getConfig(cwd);
  const logger = createLogger();
  await initializeReporters({ logger, options, config, root, defaultReporter: "json" });

  if (options.server) {
    logger.info("Running in server mode");

    if (!options.tasks?.length) {
      throw new Error("No tasks specified, this is required for when running in server mode");
    }

    const concurrency = getConcurrency(options.concurrency, config.concurrency);

    await executeRemotely({ ...options, cwd, concurrency, tasks: options.tasks }, command);
  } else {
    await executeInProcess({ logger, args: command.args, cwd, nodeArg: options.nodeArg });
  }
}
