import { runAction } from "./runAction.js";
import { watchAction } from "./watchAction.js";
import type { Command } from "commander";
import type { ReporterInitOptions } from "../../types/ReporterInitOptions.js";

interface RunOptions extends ReporterInitOptions {
  concurrency: number;
  profile: string | boolean | undefined;
  dependencies: boolean;
  dependents: boolean;
  since: string;
  to: string[];
  scope: string[];
  skipLocalCache: boolean;
  continue: boolean;
  cache: boolean;
  resetCache: boolean;
  nodeArg: string;
  ignore: string[];
  watch: boolean;
  info: boolean;
  maxWorkersPerTask: string[];
  allowNoTargetRuns: boolean;
}

export async function action(options: RunOptions, command: Command): Promise<void> {
  if (options.watch) {
    return watchAction(options, command);
  } else {
    return runAction(options, command);
  }
}
