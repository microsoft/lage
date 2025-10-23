import { createReporter } from "./createReporter.js";
import type { Logger } from "@lage-run/logger";
import {
  type BuiltInReporterName,
  type ReporterInitOptions,
  type ReporterName,
  builtInReporterNames,
} from "../types/ReporterInitOptions.js";

export async function initializeReporters(logger: Logger, options: ReporterInitOptions, customReporters: Record<string, string> = {}) {
  // Mapping from lowercase reporter name to original name
  const supportedReportersLower = Object.fromEntries(
    [...builtInReporterNames, ...Object.keys(customReporters)].map((name) => [name.toLowerCase(), name])
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
      throw new Error(
        `Invalid --reporter option: "${rawReporterName}". Supported reporters are: ${Object.keys(supportedReportersLower).join(", ")}`
      );
    }

    const reporterInstance = await createReporter(reporterName, options, customReporters);
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
