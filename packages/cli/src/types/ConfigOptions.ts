import { CacheOptions } from "./CacheOptions";
import { Priority } from "./Priority";
import { PipelineDefinition } from "./PipelineDefinition";
import { LoggerOptions } from "./LoggerOptions";
import { TargetRunnerPickerOptions } from "@lage-run/scheduler/lib/runners/TargetRunnerPicker";

export type NpmClient = "npm" | "yarn" | "pnpm";

export interface ConfigOptions {
  /**
   * Defines the task pipeline, prefix with "^" character to denote a direct topological dependency,
   * prefix with ^^ to denote a transitive topological dependency.
   *
   * Example:
   *
   * ```
   * {
   *   build: ["^build"],
   *   test: ["build"],
   *   lint: []
   *   bundle: ["^^transpile"],
   *   transpile: [],
   * }
   * ```
   */
  pipeline: PipelineDefinition;

  /** Backfill cache options */
  cacheOptions: CacheOptions;

  /** Which files to ignore when calculating scopes with --since */
  ignore: string[];

  /** disables --since flag when any of this list of files changed */
  repoWideChanges: string[];

  /** Which NPM Client to use when running npm lifecycle scripts */
  npmClient: NpmClient;

  /** Optional priority to set on tasks in a package to make the scheduler give priority to tasks on the critical path for high priority tasks */
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
   * Maximum worker idle memory, this would cause workers to restart if they exceed this limit. This is useful to prevent memory leaks.
   */
  workerIdleMemoryLimit: number; // in bytes
}
