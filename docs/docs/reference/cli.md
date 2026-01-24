---
title: Command Line Options
---

`lage` is meant to be run as a CLI. After installing `lage` inside the repository or globally, you can run the npm scripts from your repository like this:

```
lage [options] <command>
```

---

## Run Command

Runs a set of commands in a target graph. The targets are defined by packages and their scripts as defined the package.json files.

Usage: `lage [run] <command1> [command2...commandN] [options]  run commands`

### Options

**[Logging options](#logging-options)** also apply.

#### Filtering options

These can optionally be set with environment variables `LAGE_FILTER_*` (e.g. `LAGE_FILTER_SCOPE`).

```
--scope <scope...>         scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)
--no-deps|--no-dependents  disables running any dependents of the scoped packages (env: LAGE_FILTER_NO_DEPS)
--include-dependencies     adds the scoped packages dependencies as the "entry points" for the target graph run
   |--dependencies           (env: LAGE_FILTER_INCLUDE_DEPENDENCIES)
--to <scope...>            runs up to a package (shorthand for --scope=<scope...> --no-dependents)
--since <since>            only runs packages that have changed since the given commit, tag, or branch
--ignore <ignore...>       ignores files when calculating the scope with `--since` in addition to the files specified in lage.config.js
--grouped                  groups the logs (default: false)
```

#### Worker options

These can optionally be set with environment variables `LAGE_POOL_*` (e.g. `LAGE_POOL_CONCURRENCY`).

```
-c|--concurrency <number>           max jobs to run at a time
--max-workers-per-task <values...>  set max worker per task, e.g. --max-workers-per-task build=2 test=4
```

#### Other options

These can optionally be set with environment variables `LAGE_RUN_*` (e.g. `LAGE_RUN_NODE_ARG`).

```
-n|--node-arg <arg>     node arguments for workers and child processes (like NODE_OPTIONS) as a single string
                          (e.g. --nodearg="--max_old_space_size=1234 --heap-prof")
--no-cache              disables the cache (env: LAGE_RUN_CACHE)
--reset-cache           resets the cache, filling it after a run
--skip-local-cache      skips caching locally (defaults to true in CI environments)
--profile [profile]     writes a run profile into a file that can be processed by Chromium devtool
--continue              continues the run even on error
--allow-no-target-runs  succeed even if no targets match the given name
--watch                 runs in watch mode
```

### Examples

#### Basic case, running "build", "test", and "lint" against all packages

    lage build test lint

#### Concurrency

    lage build test lint --concurrency=4

#### Filtering by certain packages

Scoped to "package-a" and "package-b" and their dependencies and dependents:

    lage build test lint --scope package-a package-b

Scoped to "package-a" and "package-b" only:

    lage build test lint --scope package-a package-b --no-deps

Scoped to packages that have changed in the current branch against a target merge branch:

    lage build test lint --since origin/master

#### Providing node.js arguments for each command

    lage build test lint --nodearg=--max_old_space_size=1234 --nodearg=--heap-prof

#### Continue running even after encountering an error for one of the targets

    lage build test lint --continue

#### Controlling logged outputs

Show verbose output for each target:

    lage build test lint --verbose

Show only errors for each target:

    lage build test lint --log-level=error

Show logs as grouped by each target:

    lage build test lint --grouped --verbose

Choosing a different reporter while logging (e.g. nice outputs for Azure DevOps):

    lage build test lint --reporter=azureDevops

Or combine multiple reporters (e.g. Azure DepOps with VerboseFileLog)

    lage build test lint --reporter azureDevops --reporter vfl --log-file /my/verbose/log.file

Ignoring files when calculating the scope with --since in addition to files specified in lage.config:

    lage build test lint --since origin/master --ignore "package.json" "yarn.lock" "**/.azure-pipelines/**"

---

## Cache Command

`lage` by default will skip tasks that it has already done recently. As long as the source file and the command called to `lage` has not changed, those packages will be skipped. Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `no-cache` argument.

```
lage build --no-cache
```

### Options

[Logging options](#logging-options) also apply.

```
--prune <days>            Prunes cache older than certain number of <days>
--clear                   Clears the cache locally
```

### Examples

#### Prune local cache older than 30 days

```
lage cache --prune 30
```

#### Completely clear all local cache

```
lage cache --clear
```

---

## Common options

### Logging options

Logging options apply to most commands, and can optionally be set with environment variables `LAGE_LOGGER_*` (e.g. `LAGE_LOGGER_REPORTER`).

```
--reporter <reporter...>  reporter (choices: "default", "json", "azureDevops", "npmLog", "verboseFileLog", "vfl")
--log-level <level>       log level (choices: "info", "warn", "error", "verbose", "silly")
--log-file <file>         when used with --reporter vfl, writes verbose, ungrouped logs to the specified file
--progress                show progress (default: true locally, false in CI)
--verbose                 verbose output (default: false)
--grouped                 groups the logs by package+task (default: false)
--indented                enabled indentation of the JSON output (default: false)
```

#### Verbosity

`lage` by default will hide the output from successful tasks. If you want to see all output as it's generated, use `--verbose`:

```
lage build --verbose
```

You can also control the log level more specifically with `--log-level <level>`. This example will show `warn` messages and above (`error`):

```
lage build --log-level warn
```

Valid values are `silly`, `verbose`, `info`, `warn`, `error`. If `error` is passed to `--log-level`, you'll receive the least amount of information. The default is `info`.

#### Grouping

By default, `lage` will interweave all the `stdout` and `stderr` from all active targets as they are running.

Use the `--grouped` This may become a mess, so `lage` can group output messages together. These messages will only be displayed when the target is completed:

```
lage build --verbose --grouped
```

#### Reporter

`lage` comes with various reporters which take the logged messages of the target runs, format them, and display them.

You can pick the reporter by passing the `--reporter` flag:

```
lage build --reporter json
```

Available built-in reporters are: `default`, `azureDevops`, `fancy`, `json`, `npmLog`, `verboseFileLog` (or `vfl`), and `profile`. By default the log messages are formatted with the `default` reporter. The `profile` reporter is typically activated with the `--profile` option.

#### Custom reporters

You can also create and use your own custom reporters. Define them in your `lage.config.js`:

```javascript
module.exports = {
  reporters: {
    myReporter: "./reporters/my-custom-reporter.js"
  }
};
```

The passed-in javascript file must be from a proper ESM module or `.mjs` file.

Then use them with the `--reporter` flag:

```
lage build --reporter myReporter
```

You can also combine multiple reporters:

```
lage build --reporter json --reporter myReporter
```
