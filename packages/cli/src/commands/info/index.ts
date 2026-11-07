import { Command } from "commander";
import { infoAction } from "./action.js";
import { addOptions } from "../addOptions.js";
import {
  options,
  type FilterCliOptions,
  type InfoCliOptions,
  type LoggerCliOptions,
  type PoolCliOptions,
  type RunnerCliOptions,
  type ServerCliOptions,
} from "../options.js";

export type InfoCommandOptions = ServerCliOptions &
  RunnerCliOptions &
  LoggerCliOptions &
  FilterCliOptions &
  InfoCliOptions &
  Pick<PoolCliOptions, "concurrency">;

const command: Command = new Command("info").description("Get information about a target graph");
addOptions("server", command);
addOptions("runner", command);
addOptions("logger", command);
addOptions("filter", command);
addOptions("info", command);
command.addOption(options.pool.concurrency);
command.action(infoAction);

export { command as infoCommand };
