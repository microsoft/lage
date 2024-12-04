import os from "os";
import { Command } from "commander";
import { serverAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const serverCommand = new Command("server");
serverCommand.option("-c|--concurrency <number>", "max jobs to run at a time", (v) => parseInt(v));
serverCommand.option("-h|--host <host>", "lage server host", "localhost");
serverCommand.option<number>("-p|--port <port>", "lage worker server port", (v) => parseInt(v), 5332);
serverCommand.option<number>("-t|--timeout <seconds>", "lage server autoshutoff timeout", (v) => parseInt(v), 1 * 60);
serverCommand.option("--tasks <tasks...>", "A list of tasks to run, separated by space e.g. 'build test'");

addLoggerOptions(serverCommand).action(serverAction);

export { serverCommand };
