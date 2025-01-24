import { Command } from "commander";
import { cacheAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const cacheCommand = new Command("cache");

addOptions("cache", addOptions("logger", cacheCommand)).action(cacheAction);

export { cacheCommand };
