import { Command } from "commander";
import { infoAction } from "./action.js";
import { addFilterOptions } from "../addFilterOptions.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const infoCommand = new Command("info");

addFilterOptions(addLoggerOptions(infoCommand)).action(infoAction);
export { infoCommand };
