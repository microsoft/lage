import { Config } from "../types/Config";
import { cosmiconfigSync } from "cosmiconfig";
import { getWorkspaceRoot } from "workspace-tools";
import { parseArgs, arrifyArgs, getPassThroughArgs, validateInput } from "../args";
import os from "os";

export function getConfig(cwd: string): Config {
  // Verify presence of git
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  // Search for lage.config.js file
  const ConfigModuleName = "lage";
  const configResults = cosmiconfigSync(ConfigModuleName).search(root || cwd);

  // Parse CLI args
  const parsedArgs = parseArgs();

  if (!validateInput(parsedArgs)) {
    throw new Error("Invalid arguments passed in");
  }

  const command = parsedArgs._;

  // deps should be default true, unless exclusively turned off with '--no-deps' or from config file with "deps: false"
  let deps = parsedArgs.deps === false ? false : configResults?.config.deps === false ? false : true;

  let scope = parsedArgs.scope || configResults?.config.scope || [];

  // the --to arg means that we will not build any of the dependents and limit the scope
  if (parsedArgs.to) {
    scope = scope.concat(parsedArgs.to);
    deps = false;
  }

  const dist = parsedArgs.experimentDist || false;
  const concurrency = parsedArgs.concurrency || configResults?.config.concurrency || os.cpus().length;

  return {
    reporter: parsedArgs.reporter || "npmLog",
    grouped: parsedArgs.grouped || false,
    args: getPassThroughArgs(command, parsedArgs),
    cache: parsedArgs.cache === false ? false : true,
    resetCache: parsedArgs.resetCache || false,
    cacheOptions:
      {
        ...configResults?.config.cacheOptions,
        ...(parsedArgs.cacheKey && { cacheKey: parsedArgs.cacheKey }),
        ...(parsedArgs.skipLocalCache && { skipLocalCache: true }),
      } || {},
    command,
    concurrency,
    deps,
    ignore: parsedArgs.ignore || configResults?.config.ignore || [],
    node: parsedArgs.node ? arrifyArgs(parsedArgs.node) : [],
    npmClient: configResults?.config.npmClient || "npm",
    pipeline: configResults?.config.pipeline || {},
    priorities: configResults?.config.priorities || [],
    profile: parsedArgs.profile,
    scope,
    since: parsedArgs.since || undefined,
    verbose: parsedArgs.verbose,
    parallel: parsedArgs.parallel,
    only: false,
    repoWideChanges: configResults?.config.repoWideChanges || [
      "lage.config.js",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "lerna.json",
      "rush.json",
    ],
    to: parsedArgs.to || [],
    continue: parsedArgs.continue || configResults?.config.continue,
    safeExit: parsedArgs.safeExit,
    includeDependencies: parsedArgs.includeDependencies,
    clear: parsedArgs.clear || false,
    prune: parsedArgs.prune,
    logLevel: parsedArgs.logLevel,
    loggerOptions: configResults?.config.loggerOptions || {},
    dist,
    workerQueueOptions: configResults?.config.workerQueueOptions || {},
  };
}
