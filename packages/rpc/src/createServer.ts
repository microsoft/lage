import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import { createRoutes } from "./createRoutes.js";
import type { ILageService } from "./types/ILageService.js";

export async function createServer(lageService: ILageService, abortController: AbortController): Promise<import("fastify").FastifyInstance<import("http2").Http2Server, import("http2").Http2ServerRequest, import("http2").Http2ServerResponse, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>> {
  const server = fastify({
    http2: true,
  });
  await server.register(fastifyConnectPlugin, {
    routes: createRoutes(lageService),
    shutdownSignal: abortController.signal,
    compressMinBytes: 512,
    grpc: true,
  });

  server.get("/", (_, reply) => {
    reply.type("text/plain");
    reply.send("lage service");
  });

  return server;
}
