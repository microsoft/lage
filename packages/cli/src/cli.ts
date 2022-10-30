import { Command } from "commander";

import { runCommand } from "./commands/run/index.js";
import { cacheCommand } from "./commands/cache/index.js";

async function main() {
  const program = new Command();
  program.addCommand(runCommand, { isDefault: true });
  program.addCommand(cacheCommand);

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
