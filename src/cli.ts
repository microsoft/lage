import { getConfig } from "./config/getConfig";
import { init } from "./command/init";
import { run } from "./command/run";
import { showHelp } from "./showHelp";
import { logger } from "./logger";
import { info } from "./command/info";
import { initReporters } from "./logger/initReporters";
import { version } from "./command/version";
import { cache } from "./command/cache";
import { worker } from "./command/worker";

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

    case "info":
      info(cwd, config);
      break;

    case "version":
      version();
      break;

    case "experiment-worker":
      logger.info(`Lage worker - let's make it`);
      worker(cwd, config);
      break;

    default:
      logger.info(`Lage task runner - let's make it`);
      run(cwd, config, reporters);
      break;
  }
} catch (e) {
  showHelp(e && (e as any).message);
}
