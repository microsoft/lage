import { Command } from "commander";
import { infoAction } from "./action.js";
import { addFilterOptions } from "../addFilterOptions.js";

const infoCommand = new Command("info");

addFilterOptions(infoCommand).action(infoAction);

export { infoCommand };
