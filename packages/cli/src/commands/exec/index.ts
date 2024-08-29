import { Command } from "commander";
import { execAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const execCommand = new Command("exec");

addLoggerOptions(execCommand).action(execAction);
export { execCommand };
