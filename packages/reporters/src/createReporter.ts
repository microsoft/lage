import { LogLevel } from "@lage-run/logger";
import { JsonReporter } from "./JsonReporter.js";
import { AdoReporter } from "./AdoReporter.js";
import { LogReporter } from "./LogReporter.js";
import { ProgressReporter } from "./ProgressReporter.js";

export function createReporter({
  reporter = "npmLog",
  progress = false,
  grouped = false,
  verbose = false,
  logLevel = LogLevel.info,
}: {
  reporter: string;
  progress?: boolean;
  grouped?: boolean;
  verbose?: boolean;
  logLevel?: LogLevel;
}) {
  switch (reporter) {
    case "json":
      return new JsonReporter({ logLevel });
    case "azureDevops":
    case "adoLog":
      return new AdoReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
    default:
      return progress
        ? new ProgressReporter({ logLevel: LogLevel.verbose })
        : new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
  }
}
