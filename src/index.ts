import { cosmiconfigSync } from "cosmiconfig";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { EventEmitter } from "events";
import { getPackageInfos, findGitRoot } from "workspace-tools";
import { initialize } from "./logger";
import { RunContext } from "./types/RunContext";
import { runTasks } from "./task/taskRunner";
import log from "npmlog";
import os from "os";
import PQueue from "p-queue/dist";
import Profiler from "@lerna/profiler";
import yargsParser from "yargs-parser";

const parsedArgs = yargsParser(process.argv.slice(2), {
  string: ["since"],
  array: ["scope", "node"],
});

const root = findGitRoot(process.cwd());
if (!root) {
  throw new Error("This must be called inside a git-controlled repo");
}

const ConfigModuleName = "lage";
const configResults = cosmiconfigSync(ConfigModuleName).search(
  root || process.cwd()
);

const concurrency = os.cpus().length - 1;
const command = parsedArgs._[0];

const events = new EventEmitter();

const context: RunContext = {
  root,
  allPackages: getPackageInfos(root),
  command,
  concurrency,
  pipeline: configResults?.config.pipeline || {
    build: ["^build"],
    clean: [],
  },
  taskDepsGraph: [],
  tasks: new Map(),
  since: parsedArgs.since || "",
  ignoreGlob: [],
  deps: parsedArgs.deps || configResults?.config.deps || false,
  scope: parsedArgs.scope || configResults?.config.scope || [],
  measures: {
    start: [0, 0],
    duration: [0, 0],
    taskStats: [],
    failedTask: undefined,
  },
  profiler: new Profiler({
    concurrency,
    outputDirectory: process.cwd(),
  }),
  taskLogs: new Map(),
  queue: new PQueue({ concurrency }),
  cache: parsedArgs.cache === false ? false : true,
  node: parsedArgs.node ? arrifyArgs(parsedArgs.node) : [],
  args: getPassThroughArgs(parsedArgs),
  events,
  verbose: parsedArgs.verbose,
  profile: parsedArgs.profile,
};

initialize(context);
if (context.verbose) {
  log.level = "verbose";
}

console.log(`🧱 Lage task runner 🧱`);
console.log(``);

validateInput(context);

discoverTaskDeps(context);

events.setMaxListeners(context.tasks.size);

(async () => {
  await runTasks(context);
})();

function arrifyArgs(args: { [key: string]: string | string[] }) {
  const argsArray: string[] = [];
  for (const [key, val] of Object.entries(args)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        pushValue(key, item);
      }
    } else {
      pushValue(key, val);
    }
  }

  return argsArray;

  function pushValue(key: string, value: string) {
    let keyArg = "";

    if (typeof value === "boolean") {
      if (key.length === 1 && value) {
        keyArg = `-${key}`;
      } else if (value) {
        keyArg = `--${key}`;
      } else {
        keyArg = `--no-${key}`;
      }

      argsArray.push(keyArg);
    } else {
      argsArray.push(keyArg, value);
    }
  }
}

function getPassThroughArgs(args: { [key: string]: string | string[] }) {
  let result: string[] = [];
  result = result.concat(args._.slice(1));

  let {
    nodeArgs: _nodeArgValues,
    scope: _scopeArg,
    deps: _depsArg,
    cache: _cacheArg,
    _: _positionals,
    ...filtered
  } = args;
  result = result.concat(arrifyArgs(filtered));

  return result;
}

function validateInput(context: RunContext) {
  if (parsedArgs._.length < 1) {
    console.log("Usage: lage [command]");
    process.exit(0);
  }
}
