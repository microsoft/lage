import { createReporter } from "./createReporter.js";
import type { Logger } from "@lage-run/logger";
import { ReporterInitOptions } from "../types/ReporterInitOptions.js";

export function initializeReporters(logger: Logger, options: ReporterInitOptions) {
  const { reporter } = options;
  const reporterOptions = Array.isArray(reporter) ? reporter : [reporter];
  for (const reporter of reporterOptions) {
    const reporterInstance = createReporter(reporter, options);
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
