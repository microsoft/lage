---
sidebar_position: 1

title: Command Line Options
---

`lage` is meant to be run as a CLI. After installing `lage` inside the repository or globally, you can run the npm scripts from your repository like this:


``` 
$ lage [options] <command>
```

---
## Run Command

Runs a set of commands in a target graph. The targets are defined by packages and their scripts as defined the package.json files.

Usage: `lage [run] <command1> [command2...commandN] [options]  run commands`

### Options

```
  --reporter <reporter...>                          reporter (default: "npmLog")
  --log-level <level>                               log level (choices: "info", "warn", "error", "verbose", "silly")
  --verbose                                         verbose output
  -c, --concurrency <n>                             concurrency (default: 9)
  --scope <scope...>                                scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)
  --no-dependents|--no-deps                         disables running any dependents of the scoped packages
  --dependencies|--include-dependencies             adds the scoped packages dependencies as the "entry points" for the target graph run
  --since <since>                                   only runs packages that have changed since the given commit, tag, or branch
  --to <scope...>                                   runs up to a package (shorthand for --scope=<scope...> --no-dependents)
  --grouped                                         groups the logs (default: false)
  --no-cache                                        disables the cache
  --reset-cache                                     resets the cache, filling it after a run
  --skip-local-cache                                skips caching locally
  --profile [profile]                               writes a run profile into a file that can be processed by Chromium devtool
  --nodearg <nodeArg>                               arguments to be passed to node (e.g. --nodearg="--max_old_space_size=1234 --heap-prof" - set via "NODE_OPTIONS" environment variable
  --continue                                        continues the run even on error
  -h, --help                                        display help for command
```

### Examples

#### Basic case, running "build", "test", and "lint" against all packages

    $ lage build test lint

#### Concurrency
  
    $ lage build test lint --concurrency=4

#### Filtering by certain packages

Scoped to "package-a" and "package-b" and their dependencies and dependents:

    $ lage build test lint --scope package-a package-b

Scoped to "package-a" and "package-b" only:

    $ lage build test lint --scope package-a package-b --no-deps

Scoped to packages that have changed in the current branch against a target merge branch:

    $ lage build test lint --since origin/master

#### Continue running even after encountering an error for one of the targets

    $ lage build test lint --continue

#### Controlling logged outputs

Show verbose output for each target:

    $ lage build test lint --verbose

Show only errors for each target:

    $ lage build test lint --log-level=error

Show logs as grouped by each target:

    $ lage build test lint --grouped --verbose

Choosing a different reporter while logging (e.g. nice outputs for Azure DevOps):

    $ lage build test lint --reporter=azureDevOps

---
## Cache Command

`lage` by default will skip tasks that it has already done recently. As long as the source file and the command called to `lage` has not changed, those packages will be skipped. Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `no-cache` argument.

```
$ lage build --no-cache
```

## Verbose

`lage` by default will hide the output from successful tasks. If you want to see the output as they are being generated, call `lage` with the `verbose` argument.

```
$ lage build --verbose
```

## Options

### CliOptions
#### cache
_type: boolean_

default: true, --no-cache will skip fetching cache or saving cache

`lage` by default will skip tasks that it has already done recently. As long as the source file and the command called to `lage` has not changed, those packages will be skipped. Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `no-cache` argument.

```
$ lage build --no-cache
```

  
#### command
_type: string[]_

positional arguments that specify which tasks to run

Commands are collected as an array like this:

```
lage build test bundle
```

This will tell `lage` to execute all three commands against all the packages

  
#### concurrency
_type: number_

number of parallel tasks that can be run at a time

By default, this is the number of CPU cores detected by `os.cpus().length`,
change to any number to achieve desired concurrency.

  
#### deps
_type: boolean_

default: true, --no-deps will skip dependent packages and tasks

This has the semantic of running tasks up to what is specified in the command line
such as with `--scope` or `--since`

  
#### grouped
_type: boolean_

Specify whether to make the console logger to group the logs per package task

Example: `lage --grouped`

  
#### ignore
_type: string[]_

Ignores certain files when calculating the scope with `--since`

Certain files might need to be changed during the preparation of a build
job. In that situation, `lage` can ignore those files when calculating what
has changed with the `--since` flag.

#### include-dependencies
_type: boolean_

Include all transitive dependencies when running a command(s).
This is useful for situations where you want to "set up" a package that relies on other packages being set up.

```
lage setup --scope my-package --include-dependencies
# my-package and all of its dependencies will be setup
```

#### node
_type: string[]_

node arguments to be passed into the npm lifecycle scripts

For example:

To increase the amount of memory to use for the npm tasks
```
lage --node="--max_old_space_size=8192"
```

  
#### only
_type: boolean_

only run the commands, do not consider dependent tasks

For example, if `test` depends on `build`, `lage` will always run `build` before `test`.

You can type this `lage test --only` to skip running `build` task altogether. This is much
like what is the default of `lerna` or `rush`.

  
#### profile
_type: boolean_

Creates a flamegraph-profile JSON for Chromium-based devtool

Pay attention to the output summary to find the location of the JSON file.

  
#### reporter
_type: string_

Specify whether to use the JSON Reporter to create a parsable log output

Example: `lage --reporter json`

  
#### resetCache
_type: boolean_

--reset-cache will skip fetching cache, but will overwrite cache

```
lage --reset-cache
```

Will always run the tasks, while reseting the saved cache

  
#### scope
_type: string[]_

Which specific packages to consider as in scope for the run

This act as the "entry point" of the package-task graph traversal. To prevent
running tasks for dependent package, use the `--no-deps` flag in combination.

You can specify multiple scoped packages like this:

```
lage build --scope foo --scope bar --scope baz
```

  
#### since
_type: string_

calculate which packages are in scope based on changed packages since a mergebase

This uses the `git diff ${target_branch}...` mechanism to identify which packages
have changed. There is an assumption of all the input files for a package exist
inside their respective package folders.

  
#### to
_type: string[]_

Scopes a list of packages, and not built their dependents (consuming packages).
This implies `--scope` and `--no-deps`.

Just like the `--scope` argument, you can specify multiple packages like this:

```
lage build --to foo --to bar
```

  
#### verbose
_type: boolean_

Verbose mode, turns on all logging

`lage` by default will hide the output from successful tasks. If you want to see the
output as they are being generated, call `lage` with the `verbose` argument.

```
$ lage build --verbose
```

#### safe-exit

_type: boolean_

Runs currently executing tasks to completion before exiting.
This prevents the risk of having orphaned child processes running after
`lage` has exited.
