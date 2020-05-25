import { cosmiconfigSync } from "cosmiconfig";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { findGitRoot } from "workspace-tools";
import { initLogger } from "./logger";
import { RunContext } from "./types/RunContext";
import { runTasks } from "./task/taskRunner";
import log from "npmlog";
import { parseArgs, validateInput } from "./args";
import { createContext } from "./context";
import { setMaxEventListeners } from "./task/abortSignal";

console.log(`🧱 Lage task runner 🧱`);
console.log(``);

// Verify presence of git
const root = findGitRoot(process.cwd());
if (!root) {
  throw new Error("This must be called inside a git-controlled repo");
}

// Search for lage.config.js file
const ConfigModuleName = "lage";
const configResults = cosmiconfigSync(ConfigModuleName).search(
  root || process.cwd()
);

// Parse CLI args
const parsedArgs = parseArgs();
validateInput(parsedArgs);

// Create context
const context = createContext({ parsedArgs, root, configResults });

// Initialize logger
initLogger(context);
if (context.verbose) {
  log.level = "verbose";
}

discoverTaskDeps(context);

// Hush leaky event listeners (# of tasks = # of abort listeners)
setMaxEventListeners(context);

(async () => {
  await runTasks(context);
})();
