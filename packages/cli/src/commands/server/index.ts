import { Command } from "commander";
import { serverAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const command = new Command("server");

command.action(serverAction);
addOptions("server", command);
addOptions("pool", command);
addOptions("runner", command);
addOptions("logger", command);
command.action(serverAction);

export { command as serverCommand };
