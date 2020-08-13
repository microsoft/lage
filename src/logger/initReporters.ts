import { Config } from "../types/Config";
import { Logger } from "./Logger";
import { NpmLogReporter } from "./reporters/NpmLogReporter";
import { LogLevel } from "./LogLevel";
import { JsonReporter } from "./reporters/JsonReporter";

export function initReporters(config: Config) {
  // Initialize logger
  const logLevel = config.verbose ? LogLevel.verbose : LogLevel.info;
  const reporters = [
    config.reporter === "json"
      ? new JsonReporter({ logLevel })
      : new NpmLogReporter({
          logLevel,
          grouped: config.grouped,
        }),
  ];

  Logger.reporters = reporters;
  return reporters;
}