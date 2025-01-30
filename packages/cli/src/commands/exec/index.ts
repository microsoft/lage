import { Command } from "commander";
import { execAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const command: Command = new Command("exec");
addOptions("pool", command);
addOptions("runner", command);
addOptions("server", command);
addOptions("logger", command);
command.action(execAction);

export { command as execCommand };
