import { Config } from "../types/Config";
import { Logger } from "./Logger";
import { NpmLogReporter } from "./reporters/NpmLogReporter";
import { LogLevel } from "./LogLevel";
import { JsonReporter } from "./reporters/JsonReporter";
import { AdoReporter } from "./reporters/AdoReporter";
import { DgmlReporter } from "./reporters/DgmlReporter";

export function initReporters(config: Config) {
  // Initialize logger
  let logLevel = config.verbose ? LogLevel.verbose : LogLevel.info;
  if (config.logLevel) {
    type LogLevelString = keyof typeof LogLevel;
    logLevel = LogLevel[config.logLevel as LogLevelString];
  }

  const reporters: Array<AdoReporter | JsonReporter | NpmLogReporter> = [
    config.reporter === "json"
      ? new JsonReporter({ logLevel })
      : config.reporter === "dgml"
      ? new DgmlReporter()
      : new NpmLogReporter({
          logLevel,
          grouped: config.grouped,
          npmLoggerOptions: config.loggerOptions,
        }),
  ];

  if (config.reporter === "adoLog") {
    // Will always include NpmLogReporter and add AdoReporter
    reporters.push(new AdoReporter());
  }

  Logger.reporters = reporters;
  return reporters;
}
