---
sidebar_position: 9

title: Configuration
---

Configuration is provided by [Cosmiconfig](https://www.npmjs.com/package/cosmiconfig), so `lage` configuration is very flexible! We recommend the use of a `lage.config.js` because it is both concise and flexible.

Create a `lage.config.js` file and place all your configurations there:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
  },
};
```

### A Complete Tour of the Config

:::tip

Roll over the various properties to tour the different configs

:::

```js twoslash
/// <reference types="node" />
/** @type {import("@lage-run/cli").ConfigOptions} */
// ---cut---
module.exports = {
  pipeline: {
    build: ["^build"],
    test: {
      outputs: [],
      dependsOn: ["build"],
    },
    lint: {
      type: "worker",
      options: {
        maxWorkers: 4,
        worker: "path/to/scripts/worker/lint.js",
      },
    },
    start: [], // Calls "start" in all the packages
    "specific-package-a#test": ["specific-package-b#build"],
  },

  npmClient: "yarn", // optional, by default "npm run" is used; "yarn" can exhibit slightly different behavior,

  cacheOptions: {
    /** @see https://github.com/microsoft/backfill#configuration */
    cacheStorageConfig: {
      provider: "azure-blob", // use this to specify a remote cache provider such as "azure-blob",
      options: {
        // There are specific options here for different cache provider
      },
    },

    /**
     * Any of these files changed would invalidate the cache
     *
     * NOTE: lockfiles are NOT necessary here. lage already takes external dependency versions into account.
     */
    environmentGlob: [".github/**", ".azure-devops/**"],

    /**
     * Useful for when caches need to be versioned
     */
    cacheKey: "v1",

    /**
     * Manually set this to true so that remote caches are pushed - useful in CI systems that do *not* use standard
     * environment variables to indicate that it is run from a CI system.
     */
    writeRemoteCache: boolean,

    /**
     * Skips writes to local cache - also useful in CI (defaults to true when CI systems are detected)
     */
    skipLocalCache: boolean,
  },

  /**
   * affects the --since flag: ignore changes in these paths, so they do not count as changes between refs
   */
  ignore: ["*.md"],

  /**
   * affects the --since flag: any changes in these paths mean that --since flag is disabled; caching is not affected by this flag
   */
  repoWideChanges: ["yarn.lock"],
};
```
