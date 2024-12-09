// import { createPromiseClient } from "@connectrpc/connect";
// import { createGrpcTransport } from "@connectrpc/connect-node";
// import { LageService } from "./gen/lage/v1/lage_connect.js";
// import { createFetchClient } from "@connectrpc/connect/protocol";

import type { RunTargetResponse } from "./types/ILageService.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl }: CreateClientOptions) {
  return {
    async runTarget({
      packageName,
      task,
      taskArgs,
      clientPid,
    }: {
      packageName?: string;
      task: string;
      taskArgs: string[];
      clientPid: number;
    }) {
      const res = await fetch(`${baseUrl}/run-target`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(packageName && { packageName }),
          task,
          taskArgs,
          clientPid,
        }),
      });

      const json = await res.json();

      return json as RunTargetResponse;
    },

    async ping() {
      const res = await fetch(`${baseUrl}/ping`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return (await res.json()) as { pong: boolean };
    },
  };
}
