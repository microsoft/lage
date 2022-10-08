import { Command } from "commander";
import { runAction } from "./runAction";
import { watchAction } from "./watchAction";
import type { ReporterInitOptions } from "@lage-run/reporters";

interface RunOptions extends ReporterInitOptions {
  concurrency: number;
  profile: string | boolean | undefined;
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  skipLocalCache: boolean;
  continue: boolean;
  cache: boolean;
  resetCache: boolean;
  nodeArg: string;
  ignore: string[];
  unstableWatch: boolean;
}

export async function action(options: RunOptions, command: Command) {
  if (options.unstableWatch) {
    return watchAction(options, command);
  } else {
    return runAction(options, command);
  }
}
