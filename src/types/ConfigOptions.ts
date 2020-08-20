import { CacheOptions } from "./CacheOptions";
import { Priority } from "./Priority";
import { Pipeline } from "./Pipeline";

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

  /** Which files to ignore when calculating scopes */
  ignore: string[];

  /** Which NPM Client to use when running npm lifecycle scripts */
  npmClient: "npm" | "yarn" | "pnpm";

  /** Optional priority to set on tasks in a package to make the scheduler give priority to tasks on the critical path for high priority tasks */
  priorities: Priority[];

  /** A list of files that if changed will have a repo wide impact, forces the scope to be everything */
  environmentGlob: string[];
}
