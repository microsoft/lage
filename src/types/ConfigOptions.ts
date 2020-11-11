import { CacheOptions } from "./CacheOptions";
import { Priority } from "./Priority";
import { Pipeline } from "./Pipeline";

export type NpmClient = "npm" | "yarn" | "pnpm";

export interface ConfigOptions {
  /**
   * Defines the task pipeline, prefix with "^" character to denote a topological dependency
   *
   * Example:
   *
   * ```
   * {
   *   build: ["^build"],
   *   test: ["build"],
   *   lint: []
   * }
   * ```
   */
  pipeline: Pipeline;

  /** Should cache be enabled */
  cache: boolean;

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
   * Should we try to run the task graph as much as we can even though one task has failed
   */
  continue: boolean;
}
