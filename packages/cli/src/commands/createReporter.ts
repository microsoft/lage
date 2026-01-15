import { LogLevel } from "@lage-run/logger";
import {
  JsonReporter,
  AdoReporter,
  LogReporter,
  ProgressReporter,
  BasicReporter,
  VerboseFileLogReporter,
  ChromeTraceEventsReporter,
} from "@lage-run/reporters";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";
import type { Reporter } from "@lage-run/logger";
import { findPackageRoot } from "workspace-tools";
import { readFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import isInteractive from "is-interactive";

export async function createReporter(
  reporter: string,
  options: ReporterInitOptions,
  customReporters: Record<string, string> = {}
): Promise<Reporter> {
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

    case "fancy":
      return new ProgressReporter({ concurrency, version });

    case "verboseFileLog":
    case "vfl":
      return new VerboseFileLogReporter(logFile);

    default:
      // Check if it's a custom reporter defined in config
      if (customReporters && customReporters[reporter]) {
        const reporterPath = customReporters[reporter];
        const resolvedPath = path.isAbsolute(reporterPath) ? reporterPath : path.resolve(process.cwd(), reporterPath);

        try {
          // Use dynamic import to load the custom reporter module
          // This works with both ESM (.mjs, .js with type: module) and CommonJS (.cjs, .js) files
          const reporterModule = await import(pathToFileURL(resolvedPath).href);

          // Try different export patterns
          const ReporterClass = reporterModule.default ?? reporterModule[reporter] ?? reporterModule;

          if (typeof ReporterClass === "function") {
            return new ReporterClass(options);
          } else if (typeof ReporterClass === "object" && ReporterClass !== null) {
            // If it's already an instance
            return ReporterClass;
          } else {
            throw new Error(`Custom reporter "${reporter}" at "${resolvedPath}" does not export a valid reporter class or instance.`);
          }
        } catch (error) {
          throw new Error(`Failed to load custom reporter "${reporter}" from "${resolvedPath}": ${error}`);
        }
      }

      // Default reporter behavior
      if (progress && isInteractive() && !(logLevel >= LogLevel.verbose || verbose || grouped)) {
        return new BasicReporter({ concurrency, version });
      }

      return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel });
  }
}
