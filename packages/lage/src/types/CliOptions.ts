export interface CliOptions {
  /**
   * positional arguments that specify which tasks to run
   *
   * Commands are collected as an array like this:
   *
   * ```
   * lage build test bundle
   * ```
   *
   * This will tell `lage` to execute all three commands against all the packages
   */
  command: string[];

  /**
   * number of parallel tasks that can be run at a time
   *
   * By default, this is the number of CPU cores detected by `os.cpus().length` - 1,
   * change to any number to achieve desired concurrency.
   */
  concurrency: number;

  /**
   * Which specific packages to consider as in scope for the run
   *
   * This act as the "entry point" of the package-task graph traversal. To prevent
   * running tasks for dependent package, use the `--no-deps` flag in combination.
   *
   * You can specify multiple scoped packages like this:
   *
   * ```
   * lage build --scope foo --scope bar --scope baz
   * ```
   */
  scope: string[];

  /**
   * Scopes a list of packages, and not built their dependents (consuming packages).
   * This implies `--scope` and `--no-deps`.
   *
   * Just like the `--scope` argument, you can specify multiple packages like this:
   *
   * ```
   * lage build --to foo --to bar
   * ```
   */
  to: string[];

  /**
   * calculate which packages are in scope based on changed packages since a mergebase
   *
   * This uses the `git diff ${target_branch}...` mechanism to identify which packages
   * have changed. There is an assumption of all the input files for a package exist
   * inside their respective package folders.
   */
  since: string;

  /**
   * only run the commands, do not consider dependent tasks
   *
   * For example, if `test` depends on `build`, `lage` will always run `build` before `test`.
   *
   * You can type this `lage test --only` to skip running `build` task altogether. This is much
   * like what is the default of `lerna` or `rush`.
   */
  only: boolean;

  /**
   * default: true, --no-deps will skip dependent packages and tasks
   *
   * This has the semantic of running tasks up to what is specified in the command line
   * such as with `--scope` or `--since`
   */
  deps: boolean;

  /**
   * default: true, --no-cache will skip fetching cache or saving cache
   *
   * `lage` by default will skip tasks that it has already done recently. As long as the source file and the command called to `lage` has not changed, those packages will be skipped. Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `no-cache` argument.
   *
   * ```
   * $ lage build --no-cache
   * ```
   */
  cache: boolean;

  /**
   * --reset-cache will skip fetching cache, but will overwrite cache
   *
   * ```
   * lage --reset-cache
   * ```
   *
   * Will always run the tasks, while reseting the saved cache
   */
  resetCache: boolean;

  /** node arguments to be passed into the npm lifecycle scripts
   *
   * For example:
   *
   * To increase the amount of memory to use for the npm tasks
   * ```
   * lage --node="--max_old_space_size=8192"
   * ```
   */
  node: string[];

  /**
   * Verbose mode, turns on all logging
   *
   * `lage` by default will hide the output from successful tasks. If you want to see the
   * output as they are being generated, call `lage` with the `verbose` argument.
   *
   *  ```
   *  $ lage build --verbose
   *  ```
   */
  verbose: boolean;

  /**
   * Creates a flamegraph-profile JSON for Chromium-based devtool
   *
   * Pay attention to the output summary to find the location of the JSON file.
   */
  profile: boolean | string;

  /**
   * Ignores certain files when calculating the scope with `--since`
   *
   * Certain files might need to be changed during the preparation of a build
   * job. In that situation, `lage` can ignore those files when calculating what
   * has changed with the `--since` flag.
   */
  ignore: string[];

  /**
   * Specify which Reporter to use to create a parsable log output
   *
   * Example: `lage --reporter json`
   * Example: `lage info build --reporter dgml`
   */
  reporter: string[];

  /**
   * Specify whether to make the console logger to group the logs per package task
   *
   * Example: `lage --grouped`
   */
  grouped: boolean;

  /**
   * Run a single command in parallel
   */
  parallel: boolean;

  /**
   * Should we try to run the task graph as much as we can even though one task has failed
   */
  continue: boolean;

  /**
   * Runs currently executing tasks to completion before exiting
   */
  safeExit: boolean;

  /**
   * A flag for the cache command only: clears all the cache in all the package folders
   */
  clear: boolean;

  /**
   * A flag for the cache command only: prunes the cache older than 30 days by default, or specify a number of days
   */
  prune: string;

  /**
   * The highest log level to report. All logs up to "info" are reported by default.
   *
   * Specifying "verbose" is equivalent to running with the `--verbose` argument.
   */
  logLevel: string;

  cacheOptions: {
    /**
     * Specify a custom cache key salt with this option: --cache-key xyz_build_environemnt
     */
    cacheKey: string;

    /**
     * whether to populate or skip local cache: --skip-local-cache
     */
    skipLocalCache: boolean;
  };
}
