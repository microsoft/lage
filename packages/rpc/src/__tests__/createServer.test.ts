import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ServerHttp2Session } from "http2";
import { Code, ConnectError } from "@connectrpc/connect";
import { createClient, type LageClient } from "../createClient.js";
import { createServer, type LageServer } from "../createServer.js";
import type { ILageService } from "../types/ILageService.js";

describe("RPC client and server", () => {
  let server: LageServer | undefined;
  const sessions = new Set<ServerHttp2Session>();

  async function startServer(service: ILageService): Promise<LageClient> {
    server = await createServer(service, new AbortController());
    server.server.on("session", (session) => {
      sessions.add(session);
      session.once("close", () => sessions.delete(session));
    });
    const baseUrl = await server.listen({ host: "127.0.0.1", port: 0 });
    return createClient({ baseUrl });
  }

  afterEach(async () => {
    for (const session of sessions) {
      session.destroy();
    }
    sessions.clear();
    await server?.close();
    server = undefined;
  });

  it("pings over HTTP/2 using the generated service descriptor", async () => {
    const client = await startServer({ ping: () => ({ pong: true }) });

    await expect(client.ping({})).resolves.toMatchObject({ pong: true });
  });

  it.each([
    { description: "preserves an optional package name", packageName: "package-a" },
    { description: "preserves an omitted package name", packageName: undefined },
  ])("round-trips task fields and compressed output and $description", async ({ packageName }) => {
    const stdout = "task output\n".repeat(200);
    const runTarget = jest.fn<NonNullable<ILageService["runTarget"]>>((request) => ({
      id: "target-id",
      packageName: request.packageName,
      cwd: "/workspace",
      task: request.task,
      exitCode: 1,
      inputs: ["src/index.ts"],
      outputs: ["lib/index.js"],
      stdout,
      stderr: "task failed",
      globalInputHashFile: ".lage/global-hash",
    }));
    const client = await startServer({ runTarget });
    const request = {
      packageName,
      task: "build",
      taskArgs: ["--verbose", "--flag=value"],
      nodeOptions: "--max-old-space-size=4096",
      npmClient: "yarn",
    };

    const response = await client.runTarget(request);

    expect(runTarget).toHaveBeenCalledTimes(1);
    expect(runTarget.mock.calls[0][0]).toMatchObject({
      task: request.task,
      taskArgs: request.taskArgs,
      nodeOptions: request.nodeOptions,
      npmClient: request.npmClient,
    });
    expect(runTarget.mock.calls[0][0].packageName).toBe(packageName);
    expect(response).toMatchObject({
      id: "target-id",
      cwd: "/workspace",
      task: "build",
      exitCode: 1,
      inputs: ["src/index.ts"],
      outputs: ["lib/index.js"],
      stdout,
      stderr: "task failed",
      globalInputHashFile: ".lage/global-hash",
    });
    expect(response.packageName).toBe(packageName);
  });

  it("preserves Connect error codes and messages", async () => {
    const client = await startServer({
      runTarget: () => {
        throw new ConnectError("Target not found", Code.NotFound);
      },
    });

    await expect(client.runTarget({ task: "missing" })).rejects.toMatchObject({
      code: Code.NotFound,
      rawMessage: "Target not found",
    });
  });
});
