import { Config as CacheOptions } from "backfill-config";
import { Pipeline } from "./Pipeline";

export { CacheOptions };

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
  deps: boolean;
  cache: boolean;
  node: string[];
  args: any;
  verbose: boolean;
  profile: boolean;
  ignore: string[];
}

export type Config = ConfigOptions & CliOptions;
