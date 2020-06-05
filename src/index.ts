import { createContext } from "./context";
import { getConfig } from "./config/getConfig";
import { getWorkspace } from "./workspace/getWorkspace";
import { parseArgs, validateInput } from "./args";
import { reportSummary } from "./logger/reportSummary";
import { runTasks } from "./task/taskRunner";
import { logLevel, logger } from "./logger";
import { generateTopologicGraph } from "./workspace/generateTopologicalGraph";

console.log(`🧱 Lage task runner 🧱`);
console.log(``);

// Parse CLI args
const parsedArgs = parseArgs();
validateInput(parsedArgs);

// Create context
const cwd = process.cwd();
const config = getConfig(cwd);
const context = createContext(config);
const workspace = getWorkspace(cwd, config);

// Initialize logger
if (config.verbose) {
  logLevel("verbose");
}

// generate topological graph
const graph = generateTopologicGraph(workspace);

(async () => {
  const { profiler } = context;
  context.measures.start = process.hrtime();

  await runTasks({ graph, workspace, context, config });

  if (config.profile) {
    const profileFile = profiler.output();
    logger.info("runTasks", `Profile saved to ${profileFile}`);
  }

  context.measures.duration = process.hrtime(context.measures.start);

  await reportSummary(context);

  if (context.measures.failedTask) {
    process.exit(1);
  }
})();
