import { getConfig } from "./config/getConfig";
import { init } from "./command/init";
import { run } from "./command/run";
import { showHelp } from "./showHelp";
import { logger } from "./logger";
//import { info } from "./command/info";
import { initReporters } from "./logger/initReporters";
import { version } from "./command/version";
import { cache } from "./command/cache";

// Parse CLI args
const cwd = process.cwd();
try {
  const config = getConfig(cwd);
  const reporters = initReporters(config);

  switch (config.command[0]) {
    case "cache":
      cache(cwd, config);
      break;

    case "init":
      init(cwd);
      break;

    // case "info":
    //   info(cwd, config);
    //   break;

    case "version":
      version();
      break;

    default:
      logger.info(`Lage task runner - let's make it`);
      run(cwd, config, reporters);
      break;
  }
} catch (e) {
  showHelp(e.message);
}
