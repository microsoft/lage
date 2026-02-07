import type { CacheOptions } from "./CacheOptions.js";
import type { Priority } from "./Priority.js";
import type { PipelineDefinition } from "./PipelineDefinition.js";
import type { LoggerOptions } from "./LoggerOptions.js";
import type { TargetRunnerPickerOptions } from "@lage-run/runners";

export type NpmClient = "npm" | "yarn" | "pnpm";

/**
 * lage options including defaults (after the config file is read).
 * For the object in a config file, use `ConfigFileOptions` instead.
 */
export interface ConfigOptions {
  /**
   * Defines the task pipeline (task names, dependencies, and optional custom target configuration).
   *
   * Dependency syntax:
   * - No prefix for dependencies on tasks for the same package.
   * - Prefix with `^` to denote a direct package-topological dependency. (e.g. `^build` means run the `build` task
   *   in topological order by package.)
   * - Prefix with `^^` to denote a transitive package-topological dependency. (e.g. `^^transpile` means run the `transpile` task for nested dependencies, but *not* for the current package.)
   * - Use `packageName#taskName` to denote a dependency on a specific package's task: in the example below,
   *   package `foo`'s `build` task depends on package `bar`'s `bundle` task.
   *
   * Example:
   *
   * ```js
   * {
   *   build: ["^build"],
   *   test: ["build"],
   *   lint: [],
   *   bundle: ["^^transpile"],
   *   transpile: [],
   *   "foo#build": ["bar#bundle"]
   * }
   * ```
   */
  pipeline: PipelineDefinition;

  /** Backfill cache options */
  cacheOptions: CacheOptions;

  /** Which files to ignore when calculating scopes with `--since` */
  ignore: string[];

  /** Disable the `--since` flag when any of these files changed */
  repoWideChanges: string[];

  /** Which NPM Client to use when running npm lifecycle scripts */
  npmClient: NpmClient;

  /** Optional package task priorities, to make the scheduler give higher priority to tasks on the critical path */
  priorities: Priority[];

  /**
   * Options that will be sent to all log reporters.
   */
  loggerOptions: LoggerOptions;

  /**
   * Custom runners for tasks in the pipeline. The key is the task name, and the value is a configuration describing what would be
   * passed to the runner constructor.
   */
  runners: TargetRunnerPickerOptions;

  /**
   * Maximum worker idle memory in bytes. If exceeded, the worker will be restarted. This is useful to mitigate memory leaks.
   */
  workerIdleMemoryLimit: number;

  /**
   * Maximum number of concurrent tasks to run
   */
  concurrency: number;

  /**
   * Allows for no targets run
   */
  allowNoTargetRuns: boolean;

  /**
   * Enables the merging of target config files, rather than simply replace it when multiple matches are encoutered
   */
  enableTargetConfigMerging: boolean;

  /**
   * Custom reporters that can be referenced by name in the --reporter CLI flag.
   * The key is the reporter name, and the value is the path to the reporter module.
   *
   * Example:
   * ```
   * {
   *   myReporter: "./custom-reporters/my-reporter.js"
   * }
   * ```
   */
  reporters: Record<string, string>;
}

/** Options for a lage configuration file */
export type ConfigFileOptions = Partial<Omit<ConfigOptions, "cacheOptions">> & {
  /** Backfill cache options */
  cacheOptions?: Partial<CacheOptions>;
};
