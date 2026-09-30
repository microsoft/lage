---
title: Configuration
---

Configuration is provided by [Cosmiconfig](https://www.npmjs.com/package/cosmiconfig), so `lage` configuration is very flexible! We recommend the use of a `lage.config.js` because it is both concise and flexible.

Create a `lage.config.js` file at the workspace root and place all your configuration there.

A short example:

```js title="/lage.config.js"
/** @type {import("lage").ConfigFileOptions} */
const config = {
  pipeline: {
    build: ["^build"],
    test: ["build"]
  },
  // Update these according to your repo's build setup
  cacheOptions: {
    // Generated files in each package that will be saved into the cache
    // (relative to package root; folders must end with **/*)
    outputGlob: ["lib/**/*"],
    // Changes to any of these files/globs will invalidate the cache (relative to repo root;
    // folders must end with **/*). This should include any repo-wide configs or scripts that
    // are outside a package but could invalidate previous output. Including the lock file is
    // optional--lage attempts to more granularly check resolved dependency changes, but this
    // isn't entirely reliable, especially for peerDependencies.
    environmentGlob: ["package.json", "yarn.lock", "lage.config.js"]
  }
};
module.exports = config;
```

### Available properties

See the source for [`ConfigOptions`](https://github.com/microsoft/lage/blob/main/packages/config/src/types/ConfigOptions.ts) and its sibling files for the complete list of available options.

Some options can also be set with [CLI options or environment variables](./cli).

### Example

This example demonstrates many of the available options, including some advanced cases. Your config probably doesn't need to be this complicated, at least starting out.

```js twoslash title="/lage.config.js"
/// <reference types="node" />
// ---cut---
/** @type {import("lage").ConfigFileOptions} */
const config = {
  pipeline: {
    build: ["^build"],
    test: {
      outputs: [],
      dependsOn: ["build"]
    },
    lint: {
      type: "worker",
      maxWorkers: 4,
      options: {
        worker: "path/to/scripts/worker/lint.js"
      }
    },
    start: [], // Calls "start" in all the packages
    "specific-package-a#test": ["specific-package-b#build"]
  },

  // optional, by default "npm run" is used; "yarn" can exhibit slightly different behavior,
  npmClient: "yarn",

  cacheOptions: {
    /** @see https://www.npmjs.com/package/backfill#configuration */
    cacheStorageConfig: {
      // use this to specify a remote cache provider such as "azure-blob",
      provider: "azure-blob",
      // there are specific options here for each cache provider
      options: {}
    },

    /**
     * Any of these files changed would invalidate the cache.
     *
     * NOTE: lockfiles are NOT necessary here. lage already takes external
     * dependency versions into account.
     */
    environmentGlob: [".github/**", ".azure-devops/**"],

    /**
     * Useful for when caches need to be versioned
     */
    cacheKey: "v1",

    /**
     * Manually set this to true so that remote caches are pushed - useful in
     * CI systems that do *not* use standard environment variables to indicate
     * a CI run.
     */
    writeRemoteCache: boolean,

    /**
     * Skips writes to local cache - also useful in CI (defaults to true when
     * CI systems are detected)
     */
    skipLocalCache: boolean
  },

  /**
   * affects the --since flag: ignore changes in these paths, so they do not
   * count as changes between refs
   */
  ignore: ["*.md"],

  /**
   * affects the --since flag: any changes in these paths mean that --since
   * flag is disabled; caching is not affected by this flag
   */
  repoWideChanges: ["yarn.lock"]
};

module.exports = config;
```

## Experimental: smarter lockfile invalidation

By default, any change to your package manager's lockfile (e.g. `pnpm-lock.yaml`) is treated as a
repo-wide change: it invalidates **every** package's cache and, when using `--since`, forces
**every** package to run. This is safe but expensive — in PR builds the lockfile changes often, and
a single dependency bump ends up rebuilding the whole graph and missing the cache (including the
remote cache) for packages that were not actually affected.

The `experimentalLockfileInvalidation` option makes `lage` analyze the lockfile to determine
**exactly which workspace packages had their resolved dependency closure changed**, and only those
packages (and their dependents) are invalidated. Everything else keeps its cache hits.

```js title="/lage.config.js"
/** @type {import("lage").ConfigFileOptions} */
const config = {
  // ...
  experimentalLockfileInvalidation: {
    // Only "pnpm" is supported today.
    packageManager: "pnpm"
  }
};
```

When enabled, `lage` takes ownership of `pnpm-lock.yaml` handling. It excludes the lockfile from
`repoWideChanges` and `cacheOptions.environmentGlob` matches, including wildcard matches, so existing
configuration does not need to change:

```js title="/lage.config.js"
const config = {
  cacheOptions: {
    environmentGlob: ["package.json", "lage.config.js", "pnpm-lock.yaml"]
  },
  repoWideChanges: ["pnpm-lock.yaml"],
  experimentalLockfileInvalidation: { packageManager: "pnpm" }
};
```

Changes to top-level pnpm settings and metadata (such as overrides, patched dependencies, and unknown
future fields) still invalidate every package because they can affect the entire install. Staged and
unstaged lockfile edits are analyzed precisely. A missing, deleted, newly added, malformed, or
unsupported lockfile safely uses the blanket fallback.

### Supported package managers

Only **pnpm** is supported, and only the **latest pnpm lockfile format (`lockfileVersion 9.x`)**.

This feature relies on the lockfile being **strict and deterministic** — that is, it must fully and
unambiguously describe each workspace project's entire resolved dependency graph (including
peer-dependency resolution). pnpm's lockfile provides exactly this via its `importers` and
`snapshots` sections, which is what lets `lage` compute a precise per-package signature. Package
managers with looser or less deterministic lockfiles (npm, yarn) do not provide the same guarantees,
so they are intentionally not supported here.

For anything unsupported — a different package manager, an older pnpm lockfile version, or a lockfile
that cannot be parsed — `lage` logs a warning and **safely falls back to blanket invalidation**. The
raw lockfile content is included in every cache key, and `--since` runs every package, so builds never
silently under-invalidate.

:::caution Experimental
This option is experimental and may change. It is opt-in and has no effect on other `lage` commands
when disabled. See the [caching guide](../guides/cache.md) for more details.
:::
