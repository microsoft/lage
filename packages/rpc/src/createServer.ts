import { createRoutes } from "./createRoutes.js";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import http from "http";
import type { ILageService } from "./types/ILageService.js";

export async function createServer(lageService: ILageService, abortController: AbortController) {
  const server = http.createServer(
    connectNodeAdapter({ routes: createRoutes(lageService), grpc: true, shutdownSignal: abortController.signal }) // responds with 404 for other requests
  );

  return server;
}
