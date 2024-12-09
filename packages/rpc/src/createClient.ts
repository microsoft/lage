import { createClient as createConnectClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { LageService } from "./gen/lage/v1/lage_pb.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl }: CreateClientOptions) {
  const transport = createGrpcTransport({
    // httpVersion,
    baseUrl,
  });

  return createConnectClient(LageService, transport);
}
