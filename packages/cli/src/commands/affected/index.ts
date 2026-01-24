import { Command } from "commander";
import { affectedAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const affectedCommand: Command = new Command("affected");
addOptions("filter", affectedCommand).action(affectedAction);

export { affectedCommand };
