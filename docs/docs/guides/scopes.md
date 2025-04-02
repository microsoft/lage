---
sidebar_position: 3

title: Scoping by packages
---

By examining the [target graph](../introduction#how-does-lage-schedule-tasks), `lage` can understand which targets are not affected by a particular change being proposed in a pull request. In that case `lage` has a few CLI arguments controlling which target to run.

:::info

A target is a unit of execution in the `lage` graph. Think of it as a tuple of `[package, task]`.

:::

## Scoped builds with all its dependents

By default, `lage` runs tasks on all affected packages within a scope. Packages that changed will affect downstream consumers of the scope. In this example, `--scope` is set as `common-lib` - all of its transitive dependents (consumers of the `common-lib` package) will also have their "build" script be called.

```
lage build --scope common-lib
```

You can use wild card character: `*`. This is particularly helpful when packages are named by group or by scope. For example, `components-*` would match `components-foo` and `components-bar` packages.

```
lage build --scope components-*
```

:::note

npm has a concept of [@-scoped packages](https://docs.npmjs.com/cli/v8/using-npm/scope) in the package names. This describes a kind of grouping by an organization as defined by the npm spec. It is a _different_ concept than the `lage` scope.

:::

Speaking of `@-scopes`. We found that typing the `@-scopes` when specifying the `lage` scoped runs is a kind of [toil](https://sre.google/sre-book/eliminating-toil/) as a command line argument. So, `lage` will accept bare package names like this:

```shell
# Given that there is a package named: @myorg/wonderful-library, we can match it this way:
lage build --scope wonderful-library
```

## Scoped builds with no dependent & their dependencies

If you simply want to run all targets up to a certain scope, this is how you can achieve it:

```shell
lage build --scope build-tools --no-dependents
```

In fact, this is so useful that `lage` has a special syntactic sugar for it:

```shell
## syntactic sugar for --scope build-tools --no-dependents
lage build --to build-tools
```
