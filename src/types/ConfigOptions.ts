import { Config as CacheOptions } from "backfill-config";

export { CacheOptions };

export interface ConfigOptions {
  pipeline: { [task: string]: string[] };
  cache: boolean;
  scope: string[];
  cacheOptions: CacheOptions;
  ignore: string[];
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
