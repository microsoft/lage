import { getConfig } from "./config/getConfig";
import { init } from "./command/init";
import { run } from "./command/run";
import { showHelp } from "./showHelp";
import { logger } from "./logger";
import { Logger } from "./logger/Logger";
import { NpmLogReporter } from "./logger/reporters/NpmLogReporter";
import { LogLevel } from "./logger/LogLevel";
import { JsonReporter } from "./logger/reporters/JsonReporter";

// Parse CLI args
const cwd = process.cwd();
try {
  const config = getConfig(cwd);

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

  logger.info(`Lage task runner - let's make it`);

  if (config.command[0] === "init") {
    init(cwd);
  } else {
    run(cwd, config, reporters);
  }
} catch (e) {
  console.error(e);
  showHelp(e.message);
}
