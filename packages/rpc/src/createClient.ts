import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { LageService } from "./gen/lage/v1/lage_connect.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export function createClient({ baseUrl }: CreateClientOptions) {
  const transport = createConnectTransport({
    httpVersion: "1.1",
    baseUrl,
  });

  return createPromiseClient(LageService, transport);
}
