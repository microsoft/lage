import { createClient as connectCreateClient, type Client } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { LageService } from "./gen/lage/v1/lage_pb.js";

export interface CreateClientOptions {
  baseUrl: string;
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl }: CreateClientOptions): Client<typeof LageService> {
  const transport = createGrpcTransport({
    baseUrl,
  });

  return connectCreateClient(LageService, transport);
}
