import { Command } from "commander";
import { workerAction } from "./action.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const serverCommand = new Command("server");
serverCommand.option("-h|--host <host>", "lage server host", "localhost");
serverCommand.option<number>("-p|--port <port>", "lage worker server port", (v) => parseInt(v), 5332);

addLoggerOptions(serverCommand).action(workerAction);

export { serverCommand };
