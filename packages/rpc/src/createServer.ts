import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createRoutes } from "./createRoutes.js";
import http from "http";
import type { ILageService } from "./types/ILageService.js";

export async function createServer(lageService: ILageService, abortController: AbortController) {
  http.globalAgent.maxSockets = 10;
  const server = http.createServer(
    connectNodeAdapter({ routes: createRoutes(lageService) }) // responds with 404 for other requests
  );

  abortController.signal.addEventListener("abort", () => {
    server.close();
  });

  return server;
}
