import { Command } from "commander";
import { addFilterOptions } from "../addFilterOptions.js";
import { initAction } from "./action.js";

const initCommand = new Command("init");

addFilterOptions(initCommand).description("Install lage in a workspace and create a config file").action(initAction);

export { initCommand };
