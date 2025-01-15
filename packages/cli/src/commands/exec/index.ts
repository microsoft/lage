import { Command } from "commander";
import { execAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";
import os from "os";

const execCommand: Command = new Command("exec");
execCommand.option(
  "-n|--node-arg <arg>",
  "node argument to pass to worker, just a single string to be passed into node like a NODE_OPTIONS setting"
);
execCommand.option("-c|--concurrency <number>", "max jobs to run at a time", (v) => parseInt(v), os.cpus().length - 1);
execCommand.option("-s|--server [host:port]", "lage server host");
execCommand.option<number>("-t|--timeout <seconds>", "lage server autoshutoff timeout", (v) => parseInt(v), 5 * 60);
execCommand.option("--tasks [tasks...]", "A list of tasks to run, separated by space e.g. 'build test', used with --server");
addLoggerOptions(execCommand).action(execAction);
export { execCommand };
