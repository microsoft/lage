import { Command, Option } from "commander";
import os from "os";
import { runAction } from "./action";
import { addLoggerOptions } from "../addLoggerOptions";
import { isRunningFromCI } from "../isRunningFromCI";

const runCommand = new Command("run");

addLoggerOptions(runCommand)
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
  .option("--scope <scope...>", "scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)")
  .option("--no-deps|--no-dependents", "disables running any dependents of the scoped packages")
  .option("--include-dependencies|--dependencies", 'adds the scoped packages dependencies as the "entry points" for the target graph run')
  .option("--since <since>", "only runs packages that have changed since the given commit, tag, or branch")
  .option("--to <scope...>", "runs up to a package (shorthand for --scope=<scope...> --no-dependents)")

  // Run Command Options
  .option("--grouped", "groups the logs", false)
  .option("--no-cache", "disables the cache")
  .option("--reset-cache", "resets the cache, filling it after a run")
  .option("--skip-local-cache", "skips caching locally (defaults to true in CI environments)", isRunningFromCI)
  .option("--profile [profile]", "writes a run profile into a file that can be processed by Chromium devtool")
  .option("--ignore <ignore...>","ignores files when calculating the scope with `--since` in addition to the files specified in lage", [])
  .option(
    "--nodearg|--node-arg <nodeArg>",
    'arguments to be passed to node (e.g. --nodearg="--max_old_space_size=1234 --heap-prof" - set via "NODE_OPTIONS" environment variable'
  )
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

Ignoring files when calculating the scope with --since in addition to files specified in lage.config.js:

    $ lage build test lint --since origin/master --ignore "package.json" "yarn.lock" "**/.azure-pipelines/**"

`
  );

export { runCommand };
