---
title: Scoped builds
---

# Scoped Builds

Scoping a task runner can speed up the process especially if there are distinct clusters of packages that are not related to each other within the repository. `lage` has a `scope` option that allows the task running to proceed up to the packages found that matches the `scope` argument. This is a string matcher based on the name of the packages (not the package path).

> It is important to note that depedendents and dependencies refer to the package & task.

## Scoped builds with all its dependents

By default, it is helpful to be able to run tasks on all affected packages within a scope. Packages that changed will affect downstream consumers. In this case, pass along the `scope` to build all the dependencies as well.

> Note: you can use wild card character: `*`. This is particularly helpful when packages are named by group or by scope.

```
$ lage build --scope *build-tools*
```

## Scoped builds with no dependent & their dependencies

Sometimes we want to run the tasks needed to satisfy the `build` script of all the packages that has the `build-tools` string in their names. Think of this as running tasks up and including the package matched in the scope. Simply add a `--no-deps` flag to run up to a package task.

```
$ lage build --scope *build-tools* --no-deps
```
