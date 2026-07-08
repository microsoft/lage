---
sidebar_position: 4

title: Local caching
---

`lage` by default will cache recent task results locally on disk. As long as the source file and the command arguments have not changed, those cached results will be restored.

See [remote cache](./remote-cache.md) for details about speeding up local dev environment even further with a remote cache from Continuous Integration jobs.

## Turn off cache

Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `--no-cache` argument.

```
lage build --no-cache
```

## Resetting cache

Once in a while, the cache might need to be recreated from scratch. In those situations, you can reset the cache by passing in the `--reset-cache` argument to the command line.

```
lage build --reset-cache
```

## Cache Options

Caching capability is provided by `backfill`. All of the configuration under the `cacheOptions` key is passed to `backfill`. For the complete documentation of `cacheOptions`, see the [`backfill` configuration documentation](https://www.npmjs.com/package/backfill#configuration).

## Experimental: smarter lockfile invalidation

A common cause of poor cache hit rates in PR builds is the lockfile. By default, `lage` treats any
change to the lockfile as a repo-wide change, which invalidates every package's cache. Since the
pnpm lockfile changes frequently in PRs, this means a single dependency bump can cause a full
rebuild and total cache misses — even for packages that were not affected by the change.

The experimental `experimentalLockfileInvalidation` config option makes `lage` analyze the lockfile
and only invalidate the packages whose resolved dependency closure actually changed:

```js title="/lage.config.js"
const config = {
  cacheOptions: {
    // Do NOT include the lockfile in environmentGlob when using this feature.
    environmentGlob: ["package.json", "lage.config.js"]
  },
  // Do NOT include the lockfile in repoWideChanges when using this feature.
  repoWideChanges: [],
  experimentalLockfileInvalidation: { packageManager: "pnpm" }
};
```

`lage` computes a stable per-package signature that captures each workspace project's entire
resolved external dependency graph (using a memoized Merkle hash of the lockfile's shared dependency
DAG, so the added cost is roughly proportional to the size of the lockfile — computed once per run,
not per package). Only packages whose signature changed get a new cache key, so unaffected packages
keep their cache hits, including reuse from the [remote cache](./remote-cache.md) across PR branches.

**Only pnpm is supported**, and only the latest lockfile format (`lockfileVersion 9.x`). This
feature depends on pnpm's strict, deterministic lockfile, which precisely describes every project's
resolved dependency graph (including peer-dependency resolution). Package managers with looser
lockfiles (npm, yarn) do not offer the same guarantees and are not supported. For any unsupported
package manager or lockfile version, `lage` warns and falls back to the previous blanket
invalidation behavior, so builds are never under-invalidated.

See the [configuration reference](../reference/config.md#experimental-smarter-lockfile-invalidation)
for details.
