import { getConcurrency, type ConfigOptions } from "@lage-run/config";
import type { TargetLogger, TargetReporter } from "@lage-run/reporters";
import path from "path";
import { type BuiltInReporterName, type ReporterName, builtInReporterNames, logBuiltInReporterNames } from "../types/ReporterNames.js";
import { createReporter } from "./createReporter.js";
import type { LoggerCliOptions, PoolCliOptions, RunCliOptions } from "./options.js";

/**
 * Options for initializing reporters.
 */
export type ReporterInitOptions = Pick<
  LoggerCliOptions,
  "reporter" | "progress" | "verbose" | "grouped" | "logLevel" | "logFile" | "indented"
> &
  Pick<RunCliOptions, "profile" | "logMemory"> &
  Pick<PoolCliOptions, "concurrency">;

/**
 * Initialize reporters based on the CLI or config file options and add them to the logger.
 */
export async function initializeReporters(params: {
  /** Reporters will be added to this logger */
  logger: TargetLogger;
  options: ReporterInitOptions;
  config: Partial<Pick<ConfigOptions, "reporter" | "reporters" | "concurrency">>;
  /** Monorepo root for resolving custom reporters */
  root: string;
  /** Reporter to use instead of `"default"` if none are specified */
  defaultReporter?: BuiltInReporterName;
}): Promise<void> {
  const { logger, config, root } = params;
  const options = { ...params.options, concurrency: getConcurrency(params.options.concurrency, config.concurrency) };

  const customReporterNames = Object.keys(config.reporters || {});

  // Mapping from lowercase reporter name to original name
  const supportedReportersLower = Object.fromEntries(
    [...builtInReporterNames, ...customReporterNames].map((name) => [name.toLowerCase(), name])
  );

  const reporterOptions = options.reporter?.length ? toArray(options.reporter) : toArray(config.reporter);

  if (!reporterOptions.length) {
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

    let reporterInstance: TargetReporter;
    if (config.reporters?.[reporterName]) {
      reporterInstance = await createReporter(reporterName, options, path.resolve(root, config.reporters[reporterName]));
    } else {
      reporterInstance = await createReporter(reporterName, options);
    }
    logger.addReporter(reporterInstance);
  }
}

function toArray(value: string | string[] | undefined = []): ReporterName[] {
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}
