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
  -c, --concurrency <n>                             concurrency (default: os.cpus() - 1)
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
### Options

```
  --reporter <reporter...>  reporter (default: "npmLog")
  --log-level <level>       log level (choices: "info", "warn", "error", "verbose", "silly")
  --verbose                 verbose output
  --prune <days>            Prunes cache older than certain number of <days>
  --clear                   Clears the cache locally
  -h, --help                display help for command
```

### Examples

#### Prune local cache older than 30 days

```
$ lage cache --prune 30
```

#### Completely clear all local cache

```
$ lage cache --clear
```

---
## Global Options

These are options that apply to all commands.

### Verbosity, Log Levels, and Grouping

`lage` by default will hide the output from successful tasks. If you want to see the output as they are being generated, call `lage` with the `verbose` argument.

```
$ lage build --verbose
```

#### Log Levels

You can control the log level instead of using "--verbose" argument. You can display `warn` messages and above (`error`) in the following example:

```
$ lage build --log-level warn
```

Valid values here are `silly`, `verbose`, `info`, `warn`, `error`. If `erorr` is passed to `--log-level`, you'll receive the least amount of information. The defualt is `info`.

#### Grouped logs

`lage` will interweave all the `stdout` and `stderr` from all active targets as they are running. This may become a mess, so `lage` can group output messages together. These messages will only be displayed when the target is completed:

```
$ lage build --verbose --grouped
```

### Reporter

`lage` comes with various kinds of reporters. Reporters take the logged messages of the target runs, format them, and display them. The default one can group messages, and there are ones that would work well with various Continuous Integration systems like Azure DevOps. 

You can pick the reporter by passing the `--reporter` flag:

```
$ lage build --reporter json
```

Available reporters are: `azureDevops`, `json`. By default the log messages are formatted with the "default" reporter.

