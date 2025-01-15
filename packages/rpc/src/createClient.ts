import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { LageService } from "./gen/lage/v1/lage_connect.js";
import { MethodKind } from "@bufbuild/protobuf";
import { RunTargetRequest, RunTargetResponse, PingRequest, PingResponse } from "./gen/lage/v1/lage_pb.js";

export interface CreateClientOptions {
  baseUrl: string;
  httpVersion: "1.1" | "2";
}

export type LageClient = ReturnType<typeof createClient>;

export function createClient({ baseUrl, httpVersion }: CreateClientOptions): PromiseClient<{
    readonly typeName: "connectrpc.lage.v1.LageService";
    readonly methods: {
        readonly runTarget: {
            readonly name: "RunTarget";
            readonly I: RunTargetRequest;
            readonly O: RunTargetResponse;
            readonly kind: MethodKind.Unary;
        };
        readonly ping: {
            readonly name: "Ping";
            readonly I: PingRequest;
            readonly O: PingResponse;
            readonly kind: MethodKind.Unary;
        };
    };
}> {
  const transport = createGrpcTransport({
    httpVersion,
    baseUrl,
  });

  return createPromiseClient(LageService, transport);
}
