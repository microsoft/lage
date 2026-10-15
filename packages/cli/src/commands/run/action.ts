import type { Command } from "commander";
import type { RunCommandOptions } from "./index.js";
import { runAction } from "./runAction.js";
import { watchAction } from "./watchAction.js";

export async function action(options: RunCommandOptions, command: Command): Promise<void> {
  if (options.watch) {
    return watchAction(options, command);
  } else {
    return runAction(options, command);
  }
}
