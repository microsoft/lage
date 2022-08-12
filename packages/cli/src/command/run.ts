import { Command, Option } from "commander";
import os from "os";
/**
 * 
    args: getPassThroughArgs(command, parsedArgs),
    
    
    cacheOptions:
      {
        ...configResults?.config.cacheOptions,
        ...(parsedArgs.cacheKey && { cacheKey: parsedArgs.cacheKey }),
        ...(parsedArgs.skipLocalCache && { skipLocalCache: true }),
      } || {},
    command,
    concurrency,
    
    ignore: parsedArgs.ignore || configResults?.config.ignore || [],
    
    npmClient: configResults?.config.npmClient || "npm",
    pipeline: configResults?.config.pipeline || {},
    priorities: configResults?.config.priorities || [],
    
    
    scope,
    since: parsedArgs.since || undefined,
    verbose: parsedArgs.verbose,
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
 */

const runCommand = new Command("run");
runCommand
  .action((options, command) => {
    console.log(command.args);
    console.log(options);
  })
  .option(
    "-c, --concurrency <n>",
    "concurrency",
    (value) => {
      if (value.endsWith("%")) {
        return (parseInt(value.slice(0, -1)) / 100) * os.cpus().length;
      } else {
        return parseInt(value) || os.cpus().length - 1;
      }
    },
    os.cpus().length - 1
  )
  .option("--reporter <reporter>", "reporter", "npmLog")
  .option("--grouped", "groups the logs", false)
  .option("--no-cache", "disables the cache")
  .option("--reset-cache", "resets the cache, filling it after a run")
  .option("--no-deps", "disables running any dependents of the packages")
  .option("--profile [profile]", "writes a run profile into a file that can be processed by Chromium devtool")
  .option("--nodearg <nodeArg...>", "arguments to be passed to node (e.g. --nodearg=--max_old_space_size=1234 --nodearg=--heap-prof")
  .option("--scope <scope...>", "scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)")
  .option("--since <since>", "only runs packages that have changed since the given commit, tag, or branch")
  .option("--to <to>", "runs up to a package (shorthand for --scope=<to> --no-deps)")
  .option("--continue", "continues the run even on error")
  .option("--verbose", "verbose output")
  .addOption(new Option("--log-level <level>", "log level").choices(["info", "warn", "error", "verbose", "silly"]))
  .allowUnknownOption(true)
  .addHelpCommand("[run] command1 [command2...commandN] [options]", "run commands")
  .addHelpText(
    "after",
    `
Runs a set of commands in a target graph. The targets are defined by packages and their scripts as defined the package.json files.

Examples
========
 
### Basic case, running "build", "test", and "lint" against all packages

    $ lage build test lint

### Concurrency
  
    $ lage build test lint --concurrency=4

### Filtering by certain packages

Scoped to "package-a" and "package-b" and their dependencies and dependents:

    $ lage build test lint --scope package-a package-b

Scoped to "package-a" and "package-b" only:

    $ lage build test lint --scope package-a package-b --no-deps

Scoped to packages that have changed in the current branch against a target merge branch:

    $ lage build test lint --since origin/master

### Providing node.js arguments for each command

    $ lage build test lint --nodearg=--max_old_space_size=1234 --nodearg=--heap-prof

### Continue running even after encountering an error for one of the targets

    $ lage build test lint --continue

### Controlling logged outputs

Show verbose output for each target:

    $ lage build test lint --verbose

Show only errors for each target:

    $ lage build test lint --log-level=error

Show logs as grouped by each target:

    $ lage build test lint --grouped --verbose

Choosing a different reporter while logging (e.g. nice outputs for Azure DevOps):

    $ lage build test lint --reporter=azureDevOps
  
`
  );

export { runCommand };
