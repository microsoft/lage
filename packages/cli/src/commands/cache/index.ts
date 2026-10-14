import { Command } from "commander";
import { cacheAction } from "./action.js";
import { addOptions } from "../addOptions.js";
import { options, type CacheCliOptions, type LoggerCliOptions, type PoolCliOptions } from "../options.js";

export type CacheCommandOptions = CacheCliOptions & LoggerCliOptions & Pick<PoolCliOptions, "concurrency">;

const command = new Command("cache").description("Manage the lage cache");

addOptions("cache", command);
addOptions("logger", command);
command.addOption(options.pool.concurrency);

command.action(cacheAction);

export { command as cacheCommand };
