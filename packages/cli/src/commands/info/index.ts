import { Command } from "commander";
import { infoAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const command = new Command("info");
addOptions("server", command);
addOptions("runner", command);
addOptions("logger", command);
addOptions("filter", command);
command.action(infoAction);

export { command as infoCommand };
