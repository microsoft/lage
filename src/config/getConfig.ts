import { Config } from "../types/Config";
import { cosmiconfigSync } from "cosmiconfig";
import { findGitRoot } from "workspace-tools";
import { parseArgs, arrifyArgs, getPassThroughArgs } from "../args";
import os from "os";

export function getConfig(cwd: string): Config {
  // Verify presence of git
  const root = findGitRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a git-controlled repo");
  }

  // Search for lage.config.js file
  const ConfigModuleName = "lage";
  const configResults = cosmiconfigSync(ConfigModuleName).search(root || cwd);

  // Parse CLI args
  const parsedArgs = parseArgs();

  const command = parsedArgs._;

  // deps should be default true, unless exclusively turned off with '--no-deps' or from config file with "deps: false"
  const deps =
    parsedArgs.deps === false
      ? false
      : configResults?.config.deps === false
      ? false
      : true;

  return {
    args: getPassThroughArgs(parsedArgs),
    cache: parsedArgs.cache === false ? false : true,
    resetCache: parsedArgs.resetCache || false,
    cacheOptions: configResults?.config.cacheOptions || {},
    command,
    concurrency:
      parsedArgs.concurrency ||
      configResults?.config.concurrency ||
      os.cpus().length - 1,
    deps,
    ignore: parsedArgs.ignore || configResults?.config.ignore || [],
    node: parsedArgs.node ? arrifyArgs(parsedArgs.node) : [],
    npmClient: configResults?.config.npmClient || "npm",
    pipeline: configResults?.config.pipeline || {},
    profile: parsedArgs.profile,
    scope: parsedArgs.scope || configResults?.config.scope || [],
    since: parsedArgs.since || undefined,
    verbose: parsedArgs.verbose,
    only: false,
  };
}
