import { getConfig } from "./config/getConfig";
import { logLevel } from "./logger";
import { init } from "./command/init";
import { run } from "./command/run";
import { showHelp } from "./showHelp";

console.log(`🔨 Lage task runner - let's make it`);
console.log(``);

// Parse CLI args
const cwd = process.cwd();
try {
  const config = getConfig(cwd);

  // Initialize logger
  if (config.verbose) {
    logLevel("verbose");
  }

  if (config.command[0] === "init") {
    init(cwd);
  } else {
    run(cwd, config);
  }
} catch (e) {
  console.error(e);
  showHelp(e.message);
}
