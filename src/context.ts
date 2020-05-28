import { Arguments } from "yargs-parser";
import { CosmiconfigResult } from "cosmiconfig/dist/types";
import { RunContext } from "./types/RunContext";
import { getPackageInfos, getChangedPackages } from "workspace-tools";
import os from "os";
import Profiler from "p-profiler";
import PQueue from "p-queue";
import { arrifyArgs, getPassThroughArgs } from "./args";
import { EventEmitter } from "events";
import { findNpmClient } from "./task/findNpmClient";
import { getPackagePipelines } from "./config";

export function createContext(options: {
  parsedArgs: Arguments;
  root: string;
  configResults: CosmiconfigResult;
}): RunContext {
  const { root, parsedArgs, configResults } = options;

  const concurrency = os.cpus().length - 1;
  const command = parsedArgs._;
  const npmClient = configResults?.config.npmClient || "npm";
  const since = parsedArgs.since || undefined;
  const ignore = parsedArgs.ignore || configResults?.config.ignoreGlob || [];
  const changedPackages = getChangedPackages(root, since, ignore);
  const allPackages = getPackageInfos(root);
  const packagePipelines = getPackagePipelines(allPackages);

  return {
    root,
    pipeline: {},
    cacheOptions: configResults?.config.cacheOptions || {},
    allPackages: getPackageInfos(root),
    command,
    concurrency:
      parsedArgs.concurrency ||
      configResults?.config.concurrency ||
      concurrency,
    defaultPipeline: configResults?.config.pipeline || {
      build: ["^build"],
      clean: [],
    },
    packagePipelines,
    taskDepsGraph: [],
    tasks: new Map(),
    since,
    ignore,
    changedPackages,
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
      prefix: "lage",
      outDir: process.cwd(),
    }),
    taskLogs: new Map(),
    queue: new PQueue({ concurrency }),
    cache: parsedArgs.cache === false ? false : true,
    node: parsedArgs.node ? arrifyArgs(parsedArgs.node) : [],
    args: getPassThroughArgs(parsedArgs),
    events: new EventEmitter(),
    verbose: parsedArgs.verbose,
    profile: parsedArgs.profile,
    npmClient,
    npmCmd: findNpmClient(npmClient),
  };
}
