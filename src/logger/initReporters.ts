import { Config } from "../types/Config";
import { Logger } from "./Logger";
import { NpmLogReporter } from "./reporters/NpmLogReporter";
import { LogLevel } from "./LogLevel";
import { JsonReporter } from "./reporters/JsonReporter";

export function initReporters(config: Config) {
  // Initialize logger
  let logLevel = config.verbose ? LogLevel.verbose : LogLevel.info;
  if (config.logLevel) {
    type LogLevelString = keyof typeof LogLevel;
    logLevel = LogLevel[config.logLevel as LogLevelString];
  }

  const reporters = [
    config.reporter === "json"
      ? new JsonReporter({ logLevel })
      : new NpmLogReporter({
          logLevel,
          grouped: config.grouped,
          npmLoggerOptions: config.loggerOptions
        }),
  ];

  Logger.reporters = reporters;
  return reporters;
}