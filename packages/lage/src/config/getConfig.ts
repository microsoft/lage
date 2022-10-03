import { Config } from "../types/Config";
import { cosmiconfig } from "cosmiconfig";
import { getWorkspaceRoot } from "workspace-tools";
import { parseArgs, arrifyArgs, getPassThroughArgs, validateInput } from "../args";
import os from "os";

export async function getConfig(cwd: string): Promise<Config> {
  // Verify presence of git
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  // Search for lage.config.js file
  const ConfigModuleName = "lage";
  const configResults = await cosmiconfig(ConfigModuleName).search(root || cwd);

  // Parse CLI args
  const parsedArgs = parseArgs();

  if (!validateInput(parsedArgs)) {
    throw new Error("Invalid arguments passed in");
  }

  const command = parsedArgs._;

  const config = await Promise.resolve(configResults?.config);
  
  // deps should be default true, unless exclusively turned off with '--no-deps' or from config file with "deps: false"
  let deps = parsedArgs.deps === false ? false : config?.deps === false ? false : true;

  let scope = parsedArgs.scope || config?.scope || [];

  // the --to arg means that we will not build any of the dependents and limit the scope
  if (parsedArgs.to) {
    scope = scope.concat(parsedArgs.to);
    deps = false;
  }

  const dist = parsedArgs.experimentDist || false;
  const concurrency = parsedArgs.concurrency || config?.concurrency || os.cpus().length - 1;

  return {
    reporter: parsedArgs.reporter || "npmLog",
    grouped: parsedArgs.grouped || false,
    args: getPassThroughArgs(command, parsedArgs),
    cache: parsedArgs.cache === false ? false : true,
    resetCache: parsedArgs.resetCache || false,
    cacheOptions:
      {
        ...config?.cacheOptions,
        ...(parsedArgs.cacheKey && { cacheKey: parsedArgs.cacheKey }),
        ...(parsedArgs.skipLocalCache && { skipLocalCache: true }),
      } || {},
    command,
    concurrency,
    deps,
    ignore: parsedArgs.ignore || config?.ignore || [],
    node: parsedArgs.node ? arrifyArgs(parsedArgs.node) : [],
    npmClient: config?.npmClient || "npm",
    pipeline: config?.pipeline || {},
    priorities: config?.priorities || [],
    profile: parsedArgs.profile,
    scope,
    since: parsedArgs.since || undefined,
    verbose: parsedArgs.verbose,
    parallel: parsedArgs.parallel,
    only: false,
    repoWideChanges: config?.repoWideChanges || [
      "lage.config.js",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "lerna.json",
      "rush.json",
    ],
    to: parsedArgs.to || [],
    continue: parsedArgs.continue || config?.continue,
    safeExit: parsedArgs.safeExit,
    includeDependencies: parsedArgs.includeDependencies,
    clear: parsedArgs.clear || false,
    prune: parsedArgs.prune,
    logLevel: parsedArgs.logLevel,
    loggerOptions: config?.loggerOptions || {},
  };
}
