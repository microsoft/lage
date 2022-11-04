import { Command, Option } from "commander";
import { addLoggerOptions } from "../addLoggerOptions.js";
import { cacheAction } from "./action.js";

const cacheCommand = new Command("cache");

addLoggerOptions(cacheCommand)
  .action(cacheAction)
  .addOption(new Option("--prune <days>", "Prunes cache older than certain number of <days>").argParser(parseInt).conflicts("--clear"))
  .option("--clear", "Clears the cache locally");

export { cacheCommand };
