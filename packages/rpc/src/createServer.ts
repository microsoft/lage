import { fastify } from "fastify";
import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "workspace-tools";
import type { ILageService, RunTargetRequest } from "./types/ILageService.js";

export async function createServer(lageService: ILageService) {
  const root = getWorkspaceRoot(process.cwd())!;

  const server = fastify();

  server.post("/run-target", async (req, res) => {
    const request: RunTargetRequest = req.body as any;

    lageService.runTarget(request).then((results) => {
      const { packageName, task } = request;
      const resultsFile = path.join(root, `node_modules/.cache/lage/results/${packageName ?? ""}#${task}.json`);
      const resultsDir = path.dirname(resultsFile);

      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 0));

      // send SIGPIPE to the client process to notify that the results are ready
      process.kill(request.clientPid, "SIGPIPE");
    });

    res.send({ queued: true });
  });

  server.get("/ping", (req, res) => {
    res.send(`{"pong":true}`);
  });

  return server;
}
