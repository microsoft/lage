import { LogLevel } from "@lage-run/logger";
import { createReporter } from "./createReporter.js";
import type { Logger } from "@lage-run/logger";

export interface ReporterInitOptions {
  reporter: string[] | string;
  progress: boolean;
  verbose: boolean;
  grouped: boolean;
  concurrency: number;
  logLevel: keyof typeof LogLevel;
}

export function initializeReporters(logger: Logger, options: ReporterInitOptions) {
  const { reporter, verbose, grouped, logLevel, progress, concurrency } = options;
  const reporterOptions = Array.isArray(reporter) ? reporter : [reporter];
  for (const reporter of reporterOptions) {
    const reporterInstance = createReporter({
      verbose,
      progress,
      grouped,
      concurrency,
      logLevel: LogLevel[logLevel],
      reporter: reporter as string,
    });
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
