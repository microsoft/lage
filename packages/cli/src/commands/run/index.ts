import { Command } from "commander";
import { action } from "./action.js";
import { addOptions } from "../addOptions.js";

const command = new Command("run");

addOptions("filter", command);
addOptions("logger", command);
addOptions("pool", command);
addOptions("runner", command);
addOptions("run", command);

command
  .action(action)
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

Or combine multiple reporters (e.g. Azure DepOps with VerboseFileLog)

    $ lage build test lint --reporter azureDevOps --reporter vfl --log-file /my/verbose/log.file

Ignoring files when calculating the scope with --since in addition to files specified in lage.config:

    $ lage build test lint --since origin/master --ignore "package.json" "yarn.lock" "**/.azure-pipelines/**"

`
  );

export { command as runCommand };
