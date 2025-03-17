---
title: Configuration
---

Configuration is provided by [Cosmiconfig](https://www.npmjs.com/package/cosmiconfig), so `lage` configuration is very flexible! We recommend the use of a `lage.config.js` because it is both concise and flexible.

Create a `lage.config.js` file at the workspace root and place all your configurations there:

```js title="/lage.config.js"
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"]
  }
};
```

### A Complete Tour of the Config

:::tip

Roll over the various properties to tour the different configs

:::

```js twoslash title="/lage.config.js"
/// <reference types="node" />
/** @type {import("@lage-run/cli").ConfigOptions} */
// ---cut---
module.exports = {
  pipeline: {
    babel: {
      /**
       * Specify which input files are used to generate the output files.  These
       * are included in the cache hash to determine whether the result can be
       * fetched from the cache instead of running the build, so it is important
       * that the list is complete and as precise as possible.
       * 
       * This uses 'micromatch' package to check the patterns against the files
       * found on disk. Refer that package's documentation for the full syntax supported:
       * 
       * https://github.com/micromatch/micromatch#readme
       * 
       * Path patterns are applied to the list of files found inside the package
       * the task would run in.
       * 
       * If a path pattern is prefixed with '^' then files in packages the given
       * package depends on which match the pattern will also be considered an input.
       * 
       * Relative paths (with './' or '../' prefix) and absolute paths are not supported
       * for inputs and will be ignored if provided as they will not match anything.
       */
      inputs: ['src/**/*.{js,jsx,ts,tsx}'],

      /**
       * Specify which files are expected to be produced.  These are the files that
       * will be stored in the cache and reproduced in case of a cache hit.  It is
       * important that this list be as complete and precise as possible so that
       * if results are returned from the cache there is nothing missing, that there
       * are not irrelevant extra files in the cache, and outputs from two different
       * tasks do not conflict.
       *
       * The provided values are passed to the "globby" package, using the package directory
       * as the working directory, to identify the files to hash and cache.  Refer to its
       * documentation for details:
       *
       * https://github.com/sindresorhus/globby#readme
       * 
       */
      outputs: ['dist/*.js', 'dist/*.js.map'],

      /**
       * For npm script, you can optionally set type: "npmScript" to explicitly indicate
       * this would run a script from package.json in "scripts".
       * 
       * By default type is set to "npmScript" if the task name matches an npm script
       * in ANY package, otherwise it is set to "noop".
       * 
       * Note that if you run lage with additional options after the task name(s) those
       * arguments are passed through to the scripts that are run.  For example
       * "lage run build -- -e node" would pass "-e node" to the command for every script.
       */
      type: "npmScript",
      
      /**
       * For npm scripts there are some options available
       */
      options: {
        /**
         * Actual npm script that will be run.  Defaults to the same as the task name
         * (excluding the package name if the task was defined for a specific package)
         */
        script: "babel",

        /**
         * Additional arguments passed to the script when it is run.  Empty by default.
         * 
         * These are added AFTER any arguments propagated from the lage command line. 
         */
        taskArgs: ["--env-name", "node"],

        /**
         * Set the NODE_OPTIONS for running the task.  Empty by default.
         */
        nodeOptions: ["--max-old-space-size", "6000"]
      }
    },
    build: ["^build"],
    test: {
      outputs: [],
      dependsOn: ["build"]
    },
    // Example worker task
    lint: {
      /**
       * When you set type: "worker" it creates a worker pool where
       * the tasks are run by a worker script you provide instead of
       * running the npm script.
       * 
       * Because the worker retains state and loaded modules between
       * tasks, it can cache modules, config, and other things in
       * memory between tasks, reducing the per-task startup time.
       * 
       * The underlying implementation is workerpool:
       * 
       * https://www.npmjs.com/package/workerpool
       * 
       * The main worker function (exported as either "run" or as the
       * default export) is passed an object with these fields to run
       * a task:
       * 
       * - target: Information about the target, including:
       * - target.id: Unique ID of the target (e.g. "pkg-a#build")
       * - target.label: A display label of the target
       * - target.cwd: Working directory of the target - full path
       * - target.task: Name of the task for the target (e.g. "build", "test", "lint")
       * - target.packageName: Package name of the target. Undefined if this target is associated with repo root.
       * - target.options: Same options provided here, can be used to provide some additional
       *   options to your worker if you use the same worker in multiple tasks
       * - weight: Specified/calculated weight of the target from the task config,
       *   this can be used to calculate parallelism or resource usage in the worker
       * - taskArgs: Command line arguments provided to lage and taskArgs
       * - abortSignal: Object used to signal that the task should exit ASAP
       * - abortSignal.aborted: If true, the worker should stop working
       * - abortSignal.addEventListener('abort', cb): Provide a callback that will be
       *   invoked if the build is aborted
       *   
       * The worker can also export "shouldRun", an async function that returns a boolean
       * indicating whether the task is applicable for a given workspace.  It is provided
       * with the target as its argument. 
       */
      type: "worker",
      options: {
        /** Limit the number of concurrent workers running tasks */
        maxWorkers: 4,
        /** Path to the script that implements the worker */
        worker: "path/to/scripts/worker/lint.js"
      },
    },
    
    // Abstract task to requires a package and its dependencies are built
    "build-recursive": {
      /**
       * If set type: "noop" then the task will not run; it will only cause
       * tasks that it depends on to run.
       * 
       * outputs are ignored for "noop" type tasks.
       * 
       * Note that the task type will default to "noop" if no type is provided,
       * and there is no package.json in the monorepo with a matching entry
       * in "scripts".
       */
      type: "noop",

      /**
       * Specify tasks that should run before this one is considered done.
       */
      dependsOn: [
        /**
         * An unprefixed task references a task with that name in the same package.
         */
        "build",

        /**
         * If a task has a prefix '^' then it refers to tasks by that name
         * in the direct dependencies of this package.
         */
        "^build",

        /**
         * If a task has a prefix '^^' then it refers to tasks by that name
         * in the direct and indirect dependencies of this package.
         */
        "^^build",
        
        /**
         * A task can have a prefix of a package name plus '#' to create a
         * dependency on a task just in a specific package.  This is useful
         * if the script runs a tool that is built in another package, for
         * example.
         */
        "some-package#build",
      ],

      /**
       * A shouldRun() function can be defined for any task to filter which
       * workspaces it applies to.
       *
       * For example this could be used to only run a task if there's an
       * appropriate config file present.
       *
       * For a worker task, this is in addition to any "shouldRun" exported from the
       * worker script.
       * 
       * For an npm script, this in addition to checking that the script is defined
       * in package.json for that package.
       * 
       * This could also be just a boolean instead of a function if the calculation
       * can be statically determined (e.g. based on an environment variable).
       */
      shouldRun(target) {
        // Only run this if package.json defines a "bin" field, indicating there
        // is something to run in there
        return !!require(path.join(target.cwd, 'package.json')).bin
      }
    },
    
    // Calls "start" in all the packages
    start: {
      /**
       * Set cache: false on any task whose results should not be cached
       */
      cache: false,
      /**
       * An empty dependsOn array means the task can always run immediately.
       */
      dependsOn: []
    }, 
    "specific-package-a#test": ["specific-package-b#build"]
  },

  /**
   * Specify whether to use "yarn" or "npm" to run scripts from package.json.  Defaults to "npm"
   */
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
     * Useful for when caches need to be versioned.  Can potentially include the
     * values of any environment variables in here that should trigger a rebuild.
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
```
