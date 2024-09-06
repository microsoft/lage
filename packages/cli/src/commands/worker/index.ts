import { Command } from "commander";
import { workerAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const workerCommand = new Command("worker");
workerCommand.option("--server", "Start a worker server");
workerCommand.option("-h|--host <host>", "lage worker server host", "localhost");
workerCommand.option<number>("-p|--port <port>", "lage worker server port", (v) => parseInt(v), 5332);

addLoggerOptions(workerCommand).action(workerAction);

export { workerCommand };
