import { Command } from "commander";
import { cacheAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const command: Command = new Command("cache");

addOptions("cache", command);
addOptions("logger", command);
command.action(cacheAction);

export { command as cacheCommand };
