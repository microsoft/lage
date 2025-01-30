import { Command } from "commander";
import { initAction } from "./action.js";

const initCommand: Command = new Command("init");

initCommand.description("Install lage in a workspace and create a config file").action(initAction);

export { initCommand };
