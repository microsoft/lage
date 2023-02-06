import { LogLevel } from "@lage-run/logger";
import { JsonReporter, AdoReporter, LogReporter, ProgressReporter, ChromeTraceEventsReporter } from "@lage-run/reporters";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";

export function createReporter(reporter: string, options: ReporterInitOptions) {
  const { verbose, grouped, logLevel: logLevelName, concurrency, profile, progress } = options;
  const logLevel = LogLevel[logLevelName];

  if (progress && !(verbose || grouped)) {
    return new ProgressReporter({ concurrency });
  }

  switch (reporter) {
    case "profile":
      return new ChromeTraceEventsReporter({
        concurrency,
        outputFile: typeof profile === "string" ? profile : undefined,
      });
    case "json":
      return new JsonReporter({ logLevel });
    case "azureDevops":
    case "adoLog":
      return new AdoReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
    default:
      return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
  }
}
