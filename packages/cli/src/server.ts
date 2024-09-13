import { Command } from "commander";

import { NoTargetFoundError } from "./types/errors.js";
import { serverCommand } from "./commands/server/index.js";

async function main() {
  const program = new Command();
  program.addCommand(serverCommand, { isDefault: true });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  /* eslint-disable no-console */
  switch (err) {
    case NoTargetFoundError:
      console.log("lage: no targets found that matches the given scope.");
      break;
    default:
      console.error(err);
      break;
  }
  /* eslint-enable no-console */

  process.exitCode = 1;
});
