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
    // folders must end with **/*). This should include your lock file and any other repo-wide
    // configs or scripts that are outside a package but could invalidate previous output.
    environmentGlob: ["package.json", "yarn.lock", "lage.config.js"]
  }
};
module.exports = config;
```

### Available properties

See the source for [`ConfigOptions`](https://github.com/microsoft/lage/blob/master/packages/config/src/types/ConfigOptions.ts) and its sibling files for the complete list of available options.

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
      options: {
        maxWorkers: 4,
        worker: "path/to/scripts/worker/lint.js"
      }
    },
    start: [], // Calls "start" in all the packages
    "specific-package-a#test": ["specific-package-b#build"]
  },

  // optional, by default "npm run" is used; "yarn" can exhibit slightly different behavior,
  npmClient: "yarn",

  cacheOptions: {
    /** @see https://github.com/microsoft/backfill#configuration */
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
