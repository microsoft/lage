import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import { createRoutes } from "./createRoutes.js";
import type { ILageService } from "./types/ILageService.js";

import type { FastifyInstance, FastifyBaseLogger, FastifyTypeProviderDefault } from "fastify";
import type { Http2Server, Http2ServerRequest, Http2ServerResponse } from "http2";

export type LageServer = FastifyInstance<
  Http2Server,
  Http2ServerRequest,
  Http2ServerResponse,
  FastifyBaseLogger,
  FastifyTypeProviderDefault
>;

export async function createServer(lageService: ILageService, abortController: AbortController): Promise<LageServer> {
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
    void reply.type("text/plain").send("lage service");
  });

  return server;
}
