import type { Command, Option } from "commander";
import { options } from "./options.js";

export function addOptions(category: keyof typeof options, command: Command) {
  for (const option of Object.values<Option>(options[category])) {
    command.addOption(option);
  }
  return command;
}
