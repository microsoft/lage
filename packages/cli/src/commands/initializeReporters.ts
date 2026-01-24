import { createReporter } from "./createReporter.js";
import type { LogStructuredData, Logger, Reporter } from "@lage-run/logger";
import {
  type BuiltInReporterName,
  type ReporterInitOptions,
  type ReporterName,
  builtInReporterNames,
  logBuiltInReporterNames,
} from "../types/ReporterInitOptions.js";

export async function initializeReporters(
  logger: Logger,
  options: ReporterInitOptions,
  customReporters: Record<string, string> = {}
): Promise<Reporter<LogStructuredData>[]> {
  const customReporterNames = Object.keys(customReporters);

  // Mapping from lowercase reporter name to original name
  const supportedReportersLower = Object.fromEntries(
    [...builtInReporterNames, ...customReporterNames].map((name) => [name.toLowerCase(), name])
  );

  // filter out falsy values (e.g. undefined) from the reporter array
  const reporterOptions = (Array.isArray(options.reporter) ? options.reporter : [options.reporter]).filter(Boolean) as ReporterName[];

  if (reporterOptions.length === 0) {
    // "default" is just a dummy name to trigger the default case in createReporter
    reporterOptions.push("default" satisfies BuiltInReporterName);
  }

  // add profile reporter if --profile is passed
  if (options.profile) {
    reporterOptions.push("profile" satisfies BuiltInReporterName);
  }

  for (const rawReporterName of reporterOptions) {
    // Validate the given name, but be flexible about the casing
    const reporterName = supportedReportersLower[rawReporterName.toLowerCase()];
    if (!reporterName) {
      const reportersList = [...logBuiltInReporterNames, ...customReporterNames].join(", ");
      throw new Error(`Invalid --reporter option: "${rawReporterName}". Supported reporters are: ${reportersList}`);
    }

    const reporterInstance = await createReporter(reporterName, options, customReporters);
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
