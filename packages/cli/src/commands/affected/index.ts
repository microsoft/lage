import { Command } from "commander";
import { addFilterOptions } from "../addFilterOptions.js";
import { affectedAction } from "./action.js";

const affectedCommand: Command = new Command("affected");

addFilterOptions(affectedCommand)
  .action(affectedAction)
  .option(
    "--output-format <graph|json|default>",
    `Generate a report about what packages are affected by the current change (defaults to human readable format) ` +
      `"graph" will generate a GraphViz .dot file format`
  )
  .option("--since <branch>", "Calculate changes since this branch (defaults to origin/master)", "origin/master");

export { affectedCommand };
