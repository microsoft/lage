import { Command } from "commander";
import { execAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";
import os from "os";

const execCommand = new Command("exec");
execCommand.option("-c|--concurrency <number>", "max jobs to run at a time", (v) => parseInt(v), os.cpus().length - 1);
execCommand.option("-s|--server [host:port]", "lage server host");
execCommand.option<number>("-t|--timeout <seconds>", "lage server autoshutoff timeout", (v) => parseInt(v), 3 * 60);

addLoggerOptions(execCommand).action(execAction);
export { execCommand };
