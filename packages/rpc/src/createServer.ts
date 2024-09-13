import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import { createRoutes } from "./createRoutes.js";
import type { ILageService } from "./types/ILageService.js";
import fastifyExpress from "@fastify/express";

export async function createServer(lageService: ILageService) {
  const server = fastify();
  await server.register(fastifyExpress);
  await server.register(fastifyConnectPlugin, {
    routes: createRoutes(lageService),
  });

  server.get("/", (_, reply) => {
    reply.type("text/plain");
    reply.send("lage service");
  });

  return server;
}
