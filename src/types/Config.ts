import { Config as BackfillCacheOptions } from "backfill-config";
import { Pipeline } from "./Pipeline";
import { Priority } from "./Priority";

export type CacheOptions = BackfillCacheOptions & {
  environmentGlob: string[];
};

export interface ConfigOptions {
  pipeline: Pipeline;
  cache: boolean;
  cacheOptions: CacheOptions;
  ignore: string[];
  npmClient: "npm" | "yarn" | "pnpm";

  /** Optional priority to set on tasks in a package to make the scheduler give priority to tasks on the critical path for high priority tasks */
  priorities: Priority[];
}

export interface InternalConfigOptions {
  /** calculated */
  args: any;
}

export interface CliOptions {
  /** positional arguments that specify which tasks to run */
  command: string[];

  /** number of parallel tasks that can be run at a time */
  concurrency: number;

  /** which specific packages to consider as in scope for the run */
  scope: string[];

  /** calculate which packages are in scope based on changed packages since a mergebase */
  since?: string;

  /** only run the commands, do not consider dependent tasks */
  only: boolean;

  /** default: true, --no-deps will skip dependent packages and tasks */
  deps: boolean;

  /** default: true, --no-cache will skip fetching cache or saving cache */
  cache: boolean;

  /** --reset-cache will skip fetching cache, but will overwrite cache */
  resetCache: boolean;

  /** node arguments, e.g. --node="--max_old_space_size=8192" */
  node: string[];

  verbose: boolean;
  profile: boolean;
  ignore: string[];
}

export type Config = InternalConfigOptions & ConfigOptions & CliOptions;
