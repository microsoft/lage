import { Command } from "commander";
import { execAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const execCommand = new Command("exec");
execCommand.option("--server [server:port]", "Execute on lage server via RPC", "localhost:5332");
addLoggerOptions(execCommand).action(execAction);
export { execCommand };
