import { infoAction } from "./infoAction.js";
import { runAction } from "./runAction.js";
import { watchAction } from "./watchAction.js";
import type { Command } from "commander";
import type { ReporterInitOptions } from "@lage-run/reporters";

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
  unstableWatch: boolean;
  info: boolean;
  maxWorkersPerTask: string[];
  allowNoTargetRuns: boolean;
}

export async function action(options: RunOptions, command: Command) {
  if (options.info) {
    return infoAction(options, command);
  } else if (options.unstableWatch) {
    return watchAction(options, command);
  } else {
    return runAction(options, command);
  }
}
