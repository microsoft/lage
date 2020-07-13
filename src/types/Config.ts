import { Config as BackfillCacheOptions } from "backfill-config";
import { Pipeline } from "./Pipeline";

export type CacheOptions = BackfillCacheOptions & {
  environmentGlob: string[];
};

export interface ConfigOptions {
  pipeline: Pipeline;
  cache: boolean;
  cacheOptions: CacheOptions;
  ignore: string[];
  npmClient: "npm" | "yarn" | "pnpm";
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
