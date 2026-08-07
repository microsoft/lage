import { Command } from "commander";
import { affectedAction } from "./action.js";
import { addOptions } from "../addOptions.js";

const affectedCommand = new Command("affected").description("Get a list or graph of the affected packages");

addOptions("filter", affectedCommand);
addOptions("affected", affectedCommand);

affectedCommand.action(affectedAction);

export { affectedCommand };
