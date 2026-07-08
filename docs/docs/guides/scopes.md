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

## Experimental: smarter lockfile invalidation with `--since`

When you run `lage --since <ref>`, `lage` normally treats a lockfile change as a repo-wide change
(via `repoWideChanges`) and runs **every** package. In PR builds the pnpm lockfile changes often, so
this defeats the purpose of `--since`.

The experimental `experimentalLockfileInvalidation` config option teaches `--since` to diff the old
and new lockfile and only include the packages whose resolved dependency closure actually changed:

```js title="/lage.config.js"
const config = {
  // Remove the lockfile from repoWideChanges when enabling this feature.
  repoWideChanges: [],
  experimentalLockfileInvalidation: { packageManager: "pnpm" }
};
```

With this enabled, a lockfile change that only affects a couple of packages will only cause those
packages (and their dependents) to run under `--since`, instead of the entire graph. When the
lockfile is unchanged, this adds no extra work.

**Only pnpm is supported** (latest `lockfileVersion 9.x`), because it depends on pnpm's strict,
deterministic lockfile. Unsupported package managers or lockfile versions safely fall back to the
previous blanket behavior. See the
[configuration reference](../reference/config.md#experimental-smarter-lockfile-invalidation) and the
[caching guide](./cache.md#experimental-smarter-lockfile-invalidation) for details.
