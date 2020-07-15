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

export interface CliOptions {
  command: string[];
  concurrency: number;
  scope: string[];
  since?: string;
  only: boolean;
  deps: boolean;
  cache: boolean;
  resetCache: boolean;
  node: string[];
  args: any;
  verbose: boolean;
  profile: boolean;
  ignore: string[];
}

export type Config = ConfigOptions & CliOptions;
