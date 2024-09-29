import { Command } from "commander";
import { infoAction } from "./action.js";
import { addFilterOptions } from "../addFilterOptions.js";
import { addLoggerOptions } from "../addLoggerOptions.js";

const infoCommand = new Command("info");

addFilterOptions(addLoggerOptions(infoCommand));
infoCommand.description("Display information about a target graph in a workspace.\n" + "It is used by BuildXL to build a pip-graph");
infoCommand.option("--server [host:port]", "Run targets of type 'worker' on a background service");
infoCommand.option(
  "--nodearg|--node-arg <nodeArg>",
  'arguments to be passed to node (e.g. --nodearg="--max_old_space_size=1234 --heap-prof" - set via "NODE_OPTIONS" environment variable'
);
infoCommand.action(infoAction);

export { infoCommand };
