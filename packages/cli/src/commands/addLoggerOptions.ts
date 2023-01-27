import type { Command } from "commander";
import { Option } from "commander";

export function addLoggerOptions(program: Command) {
  const isCI = process.env.CI || process.env.TF_BUILD;
  return program
    .option("--reporter <reporter...>", "reporter", "npmLog")
    .option("--grouped", "groups the logs", false)
    .addOption(new Option("--progress").conflicts("--reporter").default(!isCI))
    .addOption(new Option("--log-level <level>", "log level").choices(["info", "warn", "error", "verbose", "silly"]).conflicts("--verbose"))
    .option("--verbose", "verbose output");
}
