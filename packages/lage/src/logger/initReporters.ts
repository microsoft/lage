import { Config } from "../types/Config";
import { Logger } from "./Logger";
import { NpmLogReporter } from "./reporters/NpmLogReporter";
import { LogLevel } from "./LogLevel";
import { JsonReporter } from "./reporters/JsonReporter";
import { AdoReporter } from "./reporters/AdoReporter";
import { DgmlReporter } from "./reporters/DgmlReporter";
import { CustomReporter } from "./reporters/CustomReporter";

export function initReporters(config: Config) {
  // Initialize logger
  let logLevel = config.verbose ? LogLevel.verbose : LogLevel.info;
  if (config.logLevel) {
    type LogLevelString = keyof typeof LogLevel;
    logLevel = LogLevel[config.logLevel as LogLevelString];
  }

  let reporters: Array<AdoReporter | JsonReporter | NpmLogReporter | DgmlReporter | CustomReporter> = [];
  if (config.reporter.includes("json")) {
    reporters.push(new JsonReporter({ logLevel }));
  } else if (config.reporter.includes("dgml")) {
    reporters.push(new DgmlReporter());
  } else {
    reporters.push(new NpmLogReporter({ logLevel, grouped: config.grouped, npmLoggerOptions: config.loggerOptions }));
  }

  // Will always include NpmLogReporter and add AdoReporter
  if (config.reporter.includes("adoLog")) {
    reporters.push(new AdoReporter());
  }

  // Will always include CustomReporter as well to pass metadata.
  const configReporters = Array.from(config.reporter);
  for (const reporter of configReporters) {
    if (reporter.match(/\.[jt]s$/)) {
      reporters.push(new CustomReporter(reporter));
    }
  }

  Logger.reporters = reporters;
  return reporters;
}
