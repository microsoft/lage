---
title: CLI usage
---

`lage` is meant to be run as a CLI. After installing `lage` inside the repository or globally, you can run the npm scripts from your repository like this:

```
$ lage build
```

## Scoped builds

Scoping a task runner can speed up the process especially if there are distinct clusters of packages that are not related to each other within the repository. `lage` has a `scope` option that allows the task running to proceed up to the packages found that matches the `scope` argument. This is a string matcher based on the name of the packages (not the package path).

```
$ lage build --scope *build-tools*
```

This will run the tasks needed to satisfy the `build` script of all the packages that has the `build-tools` string in their names. Think of this as running tasks up and including the package matched in the scope.

## Scoped builds with dependencies

Sometimes, it is helpful to be able to run tasks on all affected packages within a scope. Packages that changed will affect downstream consumers. In this case, pass a `deps` argument along with the `scope` to build all the dependencies as well.

```
$ lage build --scope *build-tools* --deps
```

## Caching

`lage` by default will skip tasks that it has already done recently. As long as the source file and the command called to `lage` has not changed, those packages will be skipped. Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `no-cache` argument.

```
$ lage build --no-cache
```

## Verbose

`lage` by default will hide the output from successful tasks. If you want to see the output as they are being generated, call `lage` with the `verbose` argument.

```
$ lage build --verbose
```
