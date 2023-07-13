import { Command } from "commander";
import { infoAction } from "./action.js";
import { addFilterOptions } from "../addFilterOptions.js";

const infoCommand = new Command("info");

addFilterOptions(infoCommand).action(infoAction).option("--reporter <<graph|json|default>", "Reporter to use");

export { infoCommand };
