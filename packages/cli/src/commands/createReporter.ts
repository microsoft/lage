import { LogLevel } from "@lage-run/logger";
import {
  JsonReporter,
  AdoReporter,
  LogReporter,
  ProgressReporter,
  VerboseFileLogReporter,
  ChromeTraceEventsReporter,
} from "@lage-run/reporters";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";
import { findPackageRoot } from "workspace-tools";
import { readFileSync } from "fs";
import path from "path";

export function createReporter(reporter: string, options: ReporterInitOptions) {
  const { verbose, grouped, logLevel: logLevelName, concurrency, profile, progress, logFile, indented } = options;
  const logLevel = LogLevel[logLevelName];

  const root = findPackageRoot(__filename)!;
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
  const version = packageJson.version;

  switch (reporter) {
    case "profile":
      return new ChromeTraceEventsReporter({
        concurrency,
        outputFile: typeof profile === "string" ? profile : undefined,
      });
    case "json":
      return new JsonReporter({ logLevel, indented: indented ?? false });
    case "azureDevops":
    case "adoLog":
      return new AdoReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });

    case "npmLog":
    case "old":
      return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });

    case "verboseFileLog":
    case "vfl":
      return new VerboseFileLogReporter(logFile);

    default:
      if (progress && !(logLevel >= LogLevel.verbose || verbose || grouped)) {
        return new ProgressReporter({ concurrency, version });
      }

      return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
  }
}
