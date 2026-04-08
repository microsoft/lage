import { createReporter } from "./createReporter.js";
import type { LogStructuredData, Logger, Reporter } from "@lage-run/logger";
import {
  type BuiltInReporterName,
  type ReporterInitOptions,
  type ReporterName,
  builtInReporterNames,
  logBuiltInReporterNames,
} from "../types/ReporterInitOptions.js";
import type { ConfigOptions } from "@lage-run/config";
import path from "path";

/**
 * Initialize reporters based on the CLI or config file options and add them to the logger.
 */
export async function initializeReporters(params: {
  /** Reporters will be added to this logger */
  logger: Logger;
  options: ReporterInitOptions;
  config: Pick<ConfigOptions, "reporter" | "reporters">;
  /** Monorepo root for resolving custom reporters */
  root: string;
  /** Reporter to use instead of `"default"` if none are specified */
  defaultReporter?: BuiltInReporterName;
}): Promise<Reporter<LogStructuredData>[]> {
  const { logger, options, config, root } = params;

  const customReporterNames = Object.keys(config.reporters);

  // Mapping from lowercase reporter name to original name
  const supportedReportersLower = Object.fromEntries(
    [...builtInReporterNames, ...customReporterNames].map((name) => [name.toLowerCase(), name])
  );

  // filter out falsy values (e.g. undefined) from the reporter array
  const useReporterOption = options.reporter?.length ? options.reporter : config.reporter;
  const reporterOptions = (Array.isArray(useReporterOption) ? [...useReporterOption] : [useReporterOption]).filter(
    Boolean
  ) as ReporterName[];

  if (reporterOptions.length === 0) {
    // "default" is just a dummy name to trigger the default case in createReporter
    reporterOptions.push(params.defaultReporter || ("default" satisfies BuiltInReporterName));
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

    let reporterInstance: Reporter;
    if (config.reporters[reporterName]) {
      reporterInstance = await createReporter(reporterName, options, path.resolve(root, config.reporters[reporterName]));
    } else {
      reporterInstance = await createReporter(reporterName, options);
    }
    logger.addReporter(reporterInstance);
  }

  return logger.reporters;
}
