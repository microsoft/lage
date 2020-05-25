import { Arguments } from "yargs-parser";
import { CosmiconfigResult } from "cosmiconfig/dist/types";
import { RunContext } from "./types/RunContext";
import { getPackageInfos } from "workspace-tools";
import os from "os";
import Profiler from "@lerna/profiler";
import PQueue from "p-queue";
import { arrifyArgs, getPassThroughArgs } from "./args";
import { EventEmitter } from "events";

export function createContext(options: {
  parsedArgs: Arguments;
  root: string;
  configResults: CosmiconfigResult;
}): RunContext {
  const { root, parsedArgs, configResults } = options;

  const concurrency = os.cpus().length - 1;
  const command = parsedArgs._;

  return {
    root,
    cacheOptions: configResults?.config.cacheOptions || {},
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
    ignore: parsedArgs.ignore || configResults?.config.ignoreGlob || [],
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
    events: new EventEmitter(),
    verbose: parsedArgs.verbose,
    profile: parsedArgs.profile,
  };
}
