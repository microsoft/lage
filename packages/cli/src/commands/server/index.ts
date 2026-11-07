import { Command } from "commander";
import { serverAction } from "./action.js";
import { addOptions } from "../addOptions.js";
import type { LoggerCliOptions, PoolCliOptions, RunnerCliOptions, ServerCliOptions } from "../options.js";

export type ServerCommandOptions = ServerCliOptions & PoolCliOptions & RunnerCliOptions & LoggerCliOptions;

const command: Command = new Command("server").description("Start a server for remote task execution");

command.action(serverAction);
addOptions("server", command);
addOptions("pool", command);
addOptions("runner", command);
addOptions("logger", command);
command.action(serverAction);

export { command as serverCommand };
