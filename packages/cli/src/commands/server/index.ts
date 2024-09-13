import os from "os";
import { Command } from "commander";
import { serverAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const serverCommand = new Command("server");
serverCommand.option("-c|--concurrency <number>", "max jobs to run at a time", (v) => parseInt(v), os.cpus().length - 1);
serverCommand.option("-h|--host <host>", "lage server host", "localhost");
serverCommand.option<number>("-p|--port <port>", "lage worker server port", (v) => parseInt(v), 5332);
serverCommand.option<number>("-t|--timeout <seconds>", "lage server autoshutoff timeout", (v) => parseInt(v), 1 * 60);

addLoggerOptions(serverCommand).action(serverAction);

export { serverCommand };
