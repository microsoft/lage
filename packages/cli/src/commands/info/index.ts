import { Command } from "commander";
import { infoAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const command: Command = new Command("info").description("Get information about a target graph");
addOptions("server", command);
addOptions("runner", command);
addOptions("logger", command);
addOptions("filter", command);
addOptions("info", command);
command.action(infoAction);

export { command as infoCommand };
