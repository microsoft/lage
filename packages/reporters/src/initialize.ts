import { LogLevel } from "@lage-run/logger";
import { createReporter } from "./createReporter";
import type { Logger } from "@lage-run/logger";

export interface ReporterInitOptions {
  reporter: string[] | string;
  verbose: boolean;
  grouped: boolean;
  logLevel: keyof typeof LogLevel;
}

export interface ReporterInitOptions {
  reporter: string[] | string;
  verbose: boolean;
  grouped: boolean;
  logLevel: keyof typeof LogLevel;
}

export function initializeReporters(logger: Logger, options: ReporterInitOptions) {
  const { reporter, verbose, grouped, logLevel } = options;
  const reporterOptions = Array.isArray(reporter) ? reporter : [reporter];
  for (const reporter of reporterOptions) {
    const reporterInstance = createReporter({
      verbose,
      grouped,
      logLevel: LogLevel[logLevel],
      reporter: reporter as string,
    });
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
