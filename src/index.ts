import { getConfig } from "./config/getConfig";
// import { logLevel } from "./logger";
import { init } from "./command/init";
import { run } from "./command/run";
import { showHelp } from "./showHelp";
import { logger } from "./logger";
import { Logger } from "./logger/Logger";
import { NpmLogReporter } from "./logger/reporters/NpmLogReporter";
import { LogLevel } from "./logger/LogLevel";

logger.info(`Lage task runner - let's make it`);

// Parse CLI args
const cwd = process.cwd();
try {
  const config = getConfig(cwd);

  // Initialize logger
  const reporters = [
    new NpmLogReporter({
      logLevel: config.verbose ? LogLevel.verbose : LogLevel.info,
      grouped: true,
    }),
  ];

  Logger.reporters = reporters;

  if (config.command[0] === "init") {
    init(cwd);
  } else {
    run(cwd, config, reporters);
  }
} catch (e) {
  console.error(e);
  showHelp(e.message);
}
