import { createServer } from "net";
import { Command } from "commander";
import createLogger from "@lage-run/logger";
import { getPackageInfosAsync } from "./functions/getPackageInfoAsync.js";
import { getWorkspacesAsync } from "./functions/getWorkspacesAsync.js";
import { hash } from "./functions/hash.js";
import { stat } from "./functions/stat.js";
import { getPipePath } from "./pipe-path.js";

async function main() {
  const program = new Command();
  program.option("--root <root>", "root of the workspace", process.cwd());
  program.action(action);
  await program.parseAsync(process.argv);
}

const logger = createLogger();
logger.addReporter({
  log(entry) {
    // eslint-disable-next-line no-console
    console.log(entry.msg);
  },
  summarize(context) {},
});

async function action(args: { root: string }) {
  const functionMap = {
    getPackageInfosAsync,
    getWorkspacesAsync,
    hash,
    stat,
  };

  const server = createServer((socket) => {
    socket.on("data", async (data) => {
      const message = JSON.parse(data.toString());
      const fn = functionMap[message.fn];
      const args = message.args;
      try {
        const results = await fn(...args);
        socket.write(JSON.stringify({ results }));
      } catch (e) {
        if (e instanceof Error) {
          socket.write(JSON.stringify({ errors: e.message }));
        }
      }
    });
  });

  const pipePath = getPipePath(args.root);

  logger.info(`Server is listening on ${pipePath}`);

  server.listen(pipePath, () => {
    logger.info("Server is ready");
  });
}

main().catch((e) => {
  logger.error(e);
});
