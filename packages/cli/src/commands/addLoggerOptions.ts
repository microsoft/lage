import type { Command } from "commander";
import { Option } from "commander";

export function addLoggerOptions(program: Command) {
  return program
    .option("--reporter <reporter...>", "reporter", "npmLog")
    .addOption(new Option("--progress").conflicts("--reporter"))
    .addOption(new Option("--log-level <level>", "log level").choices(["info", "warn", "error", "verbose", "silly"]).conflicts("--verbose"))
    .option("--verbose", "verbose output");
}
