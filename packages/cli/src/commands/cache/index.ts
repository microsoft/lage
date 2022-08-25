import { Command, Option } from "commander";
import { addLoggerOptions } from "../addLoggerOptions";
import { cacheAction } from "./action";

const cacheCommand = new Command("cache");

addLoggerOptions(cacheCommand)
  .action(cacheAction)
  .addOption(
    new Option("--prune <days>", "Prunes cache older than certain number of <days>").argParser(parseInt).default(30).conflicts("--clear")
  )
  .option("--clear", "Clears the cache locally");

export { cacheCommand };
