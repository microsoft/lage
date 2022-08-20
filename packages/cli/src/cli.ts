import { Command } from "commander";

import { runCommand } from "./commands/run";

async function main() {
  const program = new Command();
  program.addCommand(runCommand, { isDefault: true });
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  process.exitCode = 1;
});
