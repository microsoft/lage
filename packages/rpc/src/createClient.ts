import { createClient as createConnectClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { LageService } from "./gen/lage/v1/lage_pb.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl, httpVersion }: CreateClientOptions) {
  const transport = createConnectTransport({
    httpVersion,
    baseUrl,
  });

  return createConnectClient(LageService, transport);
}
