# @lage-run/reporters

This package provides some default built-in reporters to be used inside @lage-run/cli (and lage, the main entry point to the tool). The `Reporter` interface comes from `@lage-run/logger`.

## NpmLogReporter

This reporter uses the `npmlog` package that is the same logger used by `npm`. It is considered stable, and is chosen because of its ability to log in a "standard" way with a clear distinction between "INFO", "WARN", "ERR!", "VERB", etc. `npmlog` by default writes to the `stderr` stream, so be aware that these logs are written to that.

To use it, look at how it is instantiated inside the unit tests. Here's an example of a basic usage:

```typescript
const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.verbose });

reporter.log({
  data: {
    target: createTarget("a", "task"),
    status: "running",
    duration: [0, 0],
    startTime: [0, 0],
  } as TargetStatusEntry,
  level: LogLevel.verbose,
  msg: "test message",
  timestamp: 0,
});
```

It will produce a summary that looks something like this in case of errors, displaying any explicit errors in a summary section:

```
info ➔ start a test
info ✓ done a test - 10.00s
info ➔ start b build
info ✓ done b build - 30.00s
info ➔ start a build
info ✖ fail a build
info 🏗 Summary
info
info Nothing has been run.
info ----------------------------------------------
ERR! [a build] ERROR DETECTED
ERR!
ERR! test message for a#build
ERR! test message for a#build again, but look there is an error!
ERR!
info ----------------------------------------------
info Took a total of 1m 40.00s to complete
```

## JsonReporter

Every log entry being sent to this reporter will write out in a raw JSON format. When piped to another processor, be sure to handle the newline-delimited JSON objects. This is useful for making a tool on top of lage to post process the run in an automation step or as part of a larger pipeline of work.

## AdoReporter

Azure DevOps contains a set of [logging commands](https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash) that can make the logged messages more easily parsed by humans. These formatting commands include the ability to collapse logs in a group. To support this, `lage` also provides a built-in Azure DevOps reporter. It outputs roughly into something like this:

```
##[group] a test success, took 10.00s
INFO:  ➔ start a test
VERB:  |  test message for a#test
VERB:  |  test message for a#test again
INFO:  ✓ done a test - 10.00s
##[endgroup]
##[group] b build success, took 30.00s
INFO:  ➔ start b build
VERB:  |  test message for b#build
VERB:  |  test message for b#build again
INFO:  ✓ done b build - 30.00s
##[endgroup]
##[group] a build failed, took 60.00s
INFO:  ➔ start a build
VERB:  |  test message for a#build
VERB:  |  test message for a#build again, but look there is an error!
INFO:  ✖ fail a build
##[endgroup]
##[section]Summary
INFO: a build failed, took 60.00s
INFO: a test success, took 60.00s
INFO: b build success, took 60.00s
[Tasks Count] success: 2, skipped: 0, pending: 0, aborted: 0
##[error] [a build] ERROR DETECTED
##[error]
##[error] test message for a#build
##[error] test message for a#build again, but look there is an error!
##[error]
INFO:  Took a total of 1m 40.00s to complete
```
