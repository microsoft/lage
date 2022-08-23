import { Command, Option } from "commander";
import os from "os";
import { runAction } from "./runAction";

const runCommand = new Command("run");
runCommand
  .action(runAction)
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
  // Common Options
  .option("--reporter <reporter...>", "reporter", "npmLog")
  .option("--scope <scope...>", "scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)")
  .option("--no-dependents|--no-deps", "disables running any dependents of the scoped packages")
  .option("--dependencies|--include-dependencies", 'adds the scoped packages dependencies as the "entry points" for the target graph run')
  .option("--since <since>", "only runs packages that have changed since the given commit, tag, or branch")
  .option("--to <scope...>", "runs up to a package (shorthand for --scope=<scope...> --no-dependents)")
  .addOption(new Option("--log-level <level>", "log level").choices(["info", "warn", "error", "verbose", "silly"]).conflicts("--verbose"))
  .option("--verbose", "verbose output")

  // Run Command Options
  .option("--grouped", "groups the logs", false)
  .option("--no-cache", "disables the cache")
  .option("--reset-cache", "resets the cache, filling it after a run")
  .option("--skip-local-cache", "skips caching locally")

  .option("--profile [profile]", "writes a run profile into a file that can be processed by Chromium devtool")
  .option("--nodearg <nodeArg>", "arguments to be passed to node (e.g. --nodearg=\"--max_old_space_size=1234 --heap-prof\" - set via \"NODE_OPTIONS\" environment variable")
  .option("--continue", "continues the run even on error")

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
