import { createRoutes } from "./createRoutes.js";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import http2 from "http2";
import type { ILageService } from "./types/ILageService.js";

export async function createServer(lageService: ILageService, abortController: AbortController) {
  const server = http2.createServer(
    connectNodeAdapter({ routes: createRoutes(lageService), connect: true, shutdownSignal: abortController.signal }) // responds with 404 for other requests
  );

  return server;
}
