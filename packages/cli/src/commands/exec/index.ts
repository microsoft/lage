import { Command } from "commander";
import { execAction } from "./action.js";
import { addOptions } from "../addOptions.js";
import type { LoggerCliOptions, PoolCliOptions, RunnerCliOptions, ServerCliOptions } from "../options.js";

export type ExecCommandOptions = PoolCliOptions & RunnerCliOptions & ServerCliOptions & LoggerCliOptions;

const command: Command = new Command("exec").description("Execute a command in the workspace");
addOptions("pool", command);
addOptions("runner", command);
addOptions("server", command);
addOptions("logger", command);
command.action(execAction);

export { command as execCommand };
