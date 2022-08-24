import { LogLevel } from "@lage-run/logger";
import { JsonReporter, AdoReporter, NpmLogReporter } from "@lage-run/reporters";

export function createReporter({
  reporter = "npmLog",
  grouped = false,
  verbose = false,
  logLevel = LogLevel.info,
}: {
  reporter: string;
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
      return new NpmLogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
  }
}
