import { createContext } from "./context";
import { getConfig } from "./config/getConfig";
import { getDependentMap } from "workspace-tools";
import { getWorkspace } from "./workspace/getWorkspace";
import { initLogger } from "./logger";
import { parseArgs, validateInput } from "./args";
import { reportSummary } from "./logger/reportSummary";
import { runTasks } from "./task/taskRunner";
import { TopologicalGraph } from "@microsoft/task-scheduler";
import log from "npmlog";
import path from "path";

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
initLogger(context);
if (config.verbose) {
  log.level = "verbose";
}

// generate topological graph
const graph: TopologicalGraph = {};

const dependentMap = getDependentMap(workspace.allPackages);

for (const [pkg, info] of Object.entries(workspace.allPackages)) {
  const deps = dependentMap.get(pkg);

  graph[pkg] = {
    dependencies: [...(deps ? deps : [])],
    location: path.relative(workspace.root, path.dirname(info.packageJsonPath)),
  };
}

// Hush leaky event listeners (# of tasks = # of abort listeners)
// setMaxEventListeners(context);

(async () => {
  const { profiler } = context;
  context.measures.start = process.hrtime();

  await runTasks(graph, workspace, context, config);

  if (config.profile) {
    const profileFile = profiler.output();
    log.info("runTasks", `Profile saved to ${profileFile}`);
  }

  context.measures.duration = process.hrtime(context.measures.start);

  await reportSummary(context);
  if (context.measures.failedTask) {
    process.exit(1);
  }
})();
