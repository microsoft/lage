import { type Logger } from "@lage-run/logger";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";

interface ExecClientOptions {
  logger: Logger;
  server: string;
  args?: string[];
}

export async function executeRemotely({ logger, server, args }: ExecClientOptions) {
  const task = args?.length === 1 ? args?.[0] : args?.[1];
  const packageName = args?.length ?? 0 > 1 ? args?.[0] : undefined;

  if (!task) {
    throw new Error("No task provided");
  }

  const { taskArgs } = filterArgsForTasks(args ?? []);

  const rpc = (await import("@lage-run/rpc")).default;

  const baseUrl = server.startsWith("http") ? server : `http://${server}`;

  const client = rpc.createClient({
    baseUrl,
    httpVersion: baseUrl.startsWith("https") ? "2" : "1.1",
  });

  const response = await client.runTarget({
    packageName,
    task,
    taskArgs,
  });

  logger.info(`Task ${response.packageName}#${response.task} exited with code ${response.exitCode}`);

  process.exitCode = response.exitCode;
}
