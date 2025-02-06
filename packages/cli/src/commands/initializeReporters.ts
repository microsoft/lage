import { createReporter } from "./createReporter.js";
import type { LogStructuredData, Logger, Reporter } from "@lage-run/logger";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";

export function initializeReporters(logger: Logger, options: ReporterInitOptions): Reporter<LogStructuredData>[] {
  const { reporter } = options;

  // filter out falsy values (e.g. undefined) from the reporter array
  const reporterOptions = (Array.isArray(reporter) ? reporter : [reporter]).filter(Boolean);

  if (reporterOptions.length === 0) {
    // "default" is just a dummy name to trigger the default case in createReporter
    reporterOptions.push("default");
  }

  // add profile reporter if --profile is passed
  if (options.profile) {
    reporterOptions.push("profile");
  }

  for (const reporterName of reporterOptions) {
    const reporterInstance = createReporter(reporterName, options);
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
